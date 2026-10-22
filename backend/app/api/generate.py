"""
backend/app/api/generate.py

Content generation endpoints:
  - POST /api/generate              -> starts a generation, returns its job id
  - GET  /api/generate/jobs/{jobId} -> reports that job's state

The route prefix "/api/generate" is added in main.py via include_router.

**A generation runs in the background.** The POST checks who is asking and what
they asked for, reserves a place in the generation pool, creates the job and
starts the work, then returns at once. The request names a video; the run
fetches its transcript, so no text to generate from arrives in a request. The result is saved as a draft row and
linked to the job; the caller polls the GET to learn when, and reads the row.

Both routes require a signed-in user. The user is whoever the access token
belongs to — nothing in a request body names one.

**Starting is safe to repeat.** Each start carries a request key; repeating it
returns the job already made rather than creating another, so a start whose
reply was lost can be tried again without paying twice.

**Each user has a limit of unfinished generations** (`generation_per_user`).
A start is refused once the user has reached it. The database counts and
creates the job together, taking one user's starts one at a time.

**Each user has an hourly limit on length lookups** (`video_length_lookups_per_hour`),
shared with the quote route. A start that would look a length up takes one
use first, so a refused start spends none of the project's YouTube quota.

**A start costs credits.** The price comes from the format and the video's
length, which this route looks up from YouTube — nothing in the request is
read for it. The database reserves the price when it creates the job and refuses a
balance below it; the job's ending settles it (migration 014).
"""

import logging
from functools import partial
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from app.api.dependencies import CurrentUser, get_current_user
from app.api.rate_limits import take_use
from app.api.video_checks import VIDEO_ID_PATTERN, length_refusal, require_youtube_key
from app.config import settings
from app.services import jobs
from app.services.dispatch import GenerationPool, get_generation_pool
from app.services.drafts import VideoSource
from app.services.credits import CreditShortfall
from app.services.generate import GenerationError, system_prompt_for
from app.services.pricing import price_for
from app.services.prompts import ContentType, SocialPlatform
from app.services.video_length import LengthError, video_length
from app.services.worker import GenerationInput, run_job

logger = logging.getLogger(__name__)

router = APIRouter()

THUMBNAIL_PREFIX = "https://i.ytimg.com/"
BUSY_RETRY_AFTER_SECONDS = 30
#: Roughly how long a generation takes, so a refused user asks again once one
#: of theirs might have finished.
LIMIT_RETRY_AFTER_SECONDS = 60


# ── Request / Response shapes ────────────────────────────────
class GenerateRequest(BaseModel):
    # camelCase to match what the frontend sends. `contentType` is the
    # ContentType literal, so anything outside the seven types is a 422 before
    # our code runs.
    contentType: ContentType
    # Required only when contentType == "social". Ignored (and cleared) otherwise.
    platform: SocialPlatform | None = None

    # The video the content comes from, for the draft row. The watch URL is not
    # among them: it is built from videoId, so no link from a request reaches a
    # page. Nor is a length: the route looks it up, because the price depends
    # on it.
    videoId: str = Field(pattern=VIDEO_ID_PATTERN)
    title: str = Field(min_length=1, max_length=300)
    channel: str = Field(default="", max_length=200)
    thumbnailUrl: str = Field(max_length=500)

    # A key the client generates for this start. Repeating a start with the
    # same key returns the job it created instead of making — and paying for —
    # another, so a start whose reply was lost is safe to try again. Required,
    # and must be a UUID, so no client skips it and no junk is stored.
    requestId: UUID

    @model_validator(mode="before")
    @classmethod
    def refuse_supplied_text(cls, data: object) -> object:
        """
        The transcript is fetched by the run from `videoId`. A request that
        still sends text is refused rather than having it ignored, so a client
        built against the old contract fails loudly instead of quietly.
        """
        if isinstance(data, dict) and "fullText" in data:
            raise ValueError("fullText is not accepted; the transcript is fetched from videoId")
        return data

    @field_validator("thumbnailUrl")
    @classmethod
    def check_thumbnail_host(cls, value: str) -> str:
        """Only YouTube's own image host — the one every thumbnail this backend hands out uses."""
        if not value.startswith(THUMBNAIL_PREFIX):
            raise ValueError(f"thumbnailUrl must start with {THUMBNAIL_PREFIX}")
        return value

    @model_validator(mode="after")
    def check_platform(self) -> "GenerateRequest":
        """
        A social request without a platform is malformed, so it is a 422 here
        rather than a generation error later. A stray platform on any other type
        is cleared, so it cannot reach the draft row.
        """
        if self.contentType == "social":
            if self.platform is None:
                raise ValueError("platform is required when contentType is 'social'")
        else:
            self.platform = None
        return self


class StartedResponse(BaseModel):
    jobId: str


class JobStatusResponse(BaseModel):
    # No error message: it is prose, and can carry a provider's own exception
    # text. The client maps errorCode to its own copy.
    jobId: str
    status: str
    progress: int | None
    resultId: str | None
    errorCode: str | None
    createdAt: str
    completedAt: str | None
    # Words in the transcript the job generates from, once it has one.
    transcriptWords: int | None


# ── Error mapping ────────────────────────────────────────────
# What the request itself can be refused for, before any job exists. Failures
# during the run — provider errors, unusable model output — are not here: they
# arrive later, as the job's errorCode.
_REQUEST_ERROR_STATUS = {
    "unknown-content-type": 422,
}


def _refuse(status: int, code: str, message: str, headers: dict[str, str] | None = None) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message}, headers=headers)


def _not_started() -> HTTPException:
    return _refuse(500, "job-not-created", "The generation could not be started. Try again.")


def _job_already_made(user: CurrentUser, req: GenerateRequest, request_id: str) -> str | None:
    """
    The id of the job this user already made for `request_id`, or None.

    A key reused for a different video, format or platform is refused with a
    409 rather than answered with the earlier job. A failed lookup is reported
    as the job not starting; retrying with the same key is safe.
    """
    try:
        job = jobs.find_job_for_request(user.id, request_id)
    except Exception:
        logger.exception("could not look up request %s", request_id)
        raise _not_started()
    if job is None:
        return None
    if not jobs.request_matches(job, req.videoId, req.contentType, req.platform):
        raise _refuse(
            409,
            "request-key-reused",
            "That request key was already used for a different generation.",
        )
    return str(job["id"])


def _busy() -> HTTPException:
    return _refuse(
        503,
        "generation-busy",
        "Generation is busy right now. Try again in a moment.",
        headers={"Retry-After": str(BUSY_RETRY_AFTER_SECONDS)},
    )


def _at_limit() -> HTTPException:
    return _refuse(
        429,
        "generation-limit",
        "You already have as many generations running as you can at once.",
        headers={"Retry-After": str(LIMIT_RETRY_AFTER_SECONDS)},
    )


def _credits_short(shortfall: CreditShortfall | None) -> HTTPException:
    """
    A 402 saying what the start costs, what the user has, and when more
    arrive — or without those numbers, when the database's detail could not
    be read.
    """
    detail: dict[str, object] = {
        "code": "credits-short",
        "message": "You don't have enough credits for this generation.",
    }
    if shortfall is not None:
        detail["cost"] = shortfall.cost
        detail["balance"] = shortfall.balance
        detail["nextRefillAt"] = shortfall.next_refill_at.isoformat()
    return HTTPException(status_code=402, detail=detail)


# ── Start a generation ───────────────────────────────────────
@router.post("", status_code=202, response_model=StartedResponse)
def start_generation(
    req: GenerateRequest,
    user: CurrentUser = Depends(get_current_user),
    pool: GenerationPool = Depends(get_generation_pool),
) -> StartedResponse:
    """
    Check the request, then start it in the background and return its job id.

    In this order, so that a refusal at any step leaves nothing behind:
      1. the request's own checks — a failure is a 422, and no job exists
      2. the request key — a job already made for it is returned, not repeated
         and not charged again
      3. one use of the user's hourly limit on length lookups — at the limit
         a 429 `rate-limited`, and YouTube is not called; a server with no
         YouTube key is refused first, as a 503, without taking a use
      4. the price, from the video's length as YouTube reports it — a length
         that cannot be known is a 422 or 503, before a place is taken
      5. a place in the pool — none free is a 503, and no job exists
      6. the job row and its reserved price, if the user is under their limit
         and has the credits — a 429 or 402 otherwise; if the row is not
         created for any reason, the place is given back
      7. the work starts in that place

    A plain `def`: the length lookup and creating the job are blocking calls,
    so FastAPI runs this on a request thread. The generation runs on the pool.
    """
    try:
        system_prompt_for(req.contentType, req.platform)
    except GenerationError as exc:
        raise _refuse(_REQUEST_ERROR_STATUS.get(exc.code, 422), exc.code, exc.message)

    request_id = str(req.requestId)
    existing = _job_already_made(user, req, request_id)
    if existing is not None:
        return StartedResponse(jobId=existing)

    # A start refused later — for credits, the user's limit, a busy pool —
    # made no job, so repeating its key comes back here and takes another use.
    require_youtube_key()
    take_use(user.id, "video-length")

    try:
        length_seconds = video_length(req.videoId)
    except LengthError as exc:
        # Refused before anything is reserved or charged.
        raise length_refusal(exc)
    cost = price_for(req.contentType, length_seconds)

    slot = pool.reserve()
    if slot is None:
        raise _busy()

    try:
        job_id = jobs.create_job(
            user.id,
            req.videoId,
            req.contentType,
            request_id,
            req.platform,
            settings.generation_per_user,
            cost,
            settings.credits_per_month,
        )
    except jobs.JobError as exc:
        slot.release()
        if exc.code == "generation-limit":
            raise _at_limit()
        if exc.code == "credits-short":
            raise _credits_short(exc.shortfall)
        if exc.code != "duplicate-request":
            logger.warning("could not create a generation job: %s", exc.code)
            raise _not_started()
        # Another copy of this request created the job between the lookup above
        # and this insert. Answer with that job.
        existing = _job_already_made(user, req, request_id)
        if existing is None:
            raise _not_started()
        return StartedResponse(jobId=existing)
    except Exception:
        slot.release()
        logger.exception("could not create a generation job")
        raise _not_started()

    request = GenerationInput(
        content_type=req.contentType,
        platform=req.platform,
        video=VideoSource(
            video_id=req.videoId,
            url=f"https://www.youtube.com/watch?v={req.videoId}",
            title=req.title,
            channel=req.channel,
            thumbnail_url=req.thumbnailUrl,
            duration_seconds=length_seconds,
        ),
    )

    if not slot.start(partial(run_job, job_id, user.id, request)):
        # The pool closed between reserving and starting — the server is
        # stopping. End the job now rather than leave it for the sweep.
        try:
            jobs.fail(job_id, user.id, "generation-busy", "The server was stopping.")
        except Exception:
            logger.exception("job %s: could not record that it never started", job_id)
        raise _busy()

    return StartedResponse(jobId=job_id)


# ── A job's state ────────────────────────────────────────────
@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(
    job_id: UUID,
    user: CurrentUser = Depends(get_current_user),
) -> JobStatusResponse:
    """
    Report one of the caller's jobs.

    `job_id` is typed as a UUID, so anything else is a 422 before a database
    call is made. A job that does not exist and one that belongs to someone
    else get the same 404, so a job id's existence is never confirmed to
    anyone but its owner.
    """
    try:
        row = jobs.get_job(str(job_id), user.id)
    except jobs.JobError:
        raise _refuse(404, "job-not-found", "That generation does not exist.")
    except Exception:
        logger.exception("could not read job %s", job_id)
        raise _refuse(503, "job-status-unavailable", "Could not check on the generation. Try again.")

    return JobStatusResponse(
        jobId=str(row["id"]),
        status=row["status"],
        progress=row.get("progress"),
        resultId=_optional_str(row.get("result_id")),
        errorCode=row.get("error_code"),
        createdAt=str(row["created_at"]),
        completedAt=_optional_str(row.get("completed_at")),
        transcriptWords=_transcript_words(row.get("transcripts")),
    )


def _transcript_words(transcript: object) -> int | None:
    """The word count from the job's embedded transcript, or None without one."""
    if not isinstance(transcript, dict):
        return None
    words = transcript.get("word_count")
    return words if isinstance(words, int) and not isinstance(words, bool) else None


def _optional_str(value: object) -> str | None:
    return None if value is None else str(value)
