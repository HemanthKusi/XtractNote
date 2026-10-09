"""
backend/app/api/generate.py

Content generation endpoints:
  - POST /api/generate              -> starts a generation, returns its job id
  - GET  /api/generate/jobs/{jobId} -> reports that job's state

The route prefix "/api/generate" is added in main.py via include_router.

**A generation runs in the background.** The POST checks who is asking and what
they asked for, reserves a place in the generation pool, creates the job and
starts the work, then returns at once. The result is saved as a draft row and
linked to the job; the caller polls the GET to learn when, and reads the row.

Both routes require a signed-in user. The user is whoever the access token
belongs to — nothing in a request body names one.
"""

import logging
from functools import partial
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from app.api.dependencies import CurrentUser, get_current_user
from app.services import jobs
from app.services.dispatch import GenerationPool, get_generation_pool
from app.services.drafts import VideoSource
from app.services.generate import GenerationError, prepare_request
from app.services.prompts import ContentType, SocialPlatform
from app.services.worker import GenerationInput, run_job

logger = logging.getLogger(__name__)

router = APIRouter()

VIDEO_ID_PATTERN = r"^[A-Za-z0-9_-]{11}$"
THUMBNAIL_PREFIX = "https://i.ytimg.com/"
BUSY_RETRY_AFTER_SECONDS = 30


# ── Request / Response shapes ────────────────────────────────
class GenerateRequest(BaseModel):
    # camelCase to match what the frontend sends. `contentType` is the
    # ContentType literal, so anything outside the seven types is a 422 before
    # our code runs.
    fullText: str
    contentType: ContentType
    # Required only when contentType == "social". Ignored (and cleared) otherwise.
    platform: SocialPlatform | None = None

    # The video the content comes from, for the draft row. The watch URL is not
    # among them: it is built from videoId, so no link from a request reaches a
    # page.
    videoId: str = Field(pattern=VIDEO_ID_PATTERN)
    title: str = Field(min_length=1, max_length=300)
    channel: str = Field(default="", max_length=200)
    thumbnailUrl: str = Field(max_length=500)
    durationSeconds: float | None = Field(default=None, ge=0, le=86_400, allow_inf_nan=False)

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


# ── Error mapping ────────────────────────────────────────────
# What the request itself can be refused for, before any job exists. Failures
# during the run — provider errors, unusable model output — are not here: they
# arrive later, as the job's errorCode.
_REQUEST_ERROR_STATUS = {
    "empty-transcript": 422,
    "transcript-too-long": 422,
    "unknown-content-type": 422,
}


def _refuse(status: int, code: str, message: str, headers: dict[str, str] | None = None) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message}, headers=headers)


def _busy() -> HTTPException:
    return _refuse(
        503,
        "generation-busy",
        "Generation is busy right now. Try again in a moment.",
        headers={"Retry-After": str(BUSY_RETRY_AFTER_SECONDS)},
    )


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
      2. a place in the pool — none free is a 503, and no job exists
      3. the job row — if it cannot be created, the place is given back
      4. the work starts in that place

    A plain `def`: creating the job is a blocking database call, so FastAPI
    runs this on a request thread. The generation itself runs on the pool.
    """
    try:
        prepare_request(req.fullText, req.contentType, req.platform)
    except GenerationError as exc:
        raise _refuse(_REQUEST_ERROR_STATUS.get(exc.code, 422), exc.code, exc.message)

    slot = pool.reserve()
    if slot is None:
        raise _busy()

    try:
        job_id = jobs.create_job(user.id, req.videoId, req.contentType)
    except Exception:
        slot.release()
        logger.exception("could not create a generation job")
        raise _refuse(500, "job-not-created", "The generation could not be started. Try again.")

    request = GenerationInput(
        full_text=req.fullText,
        content_type=req.contentType,
        platform=req.platform,
        video=VideoSource(
            video_id=req.videoId,
            url=f"https://www.youtube.com/watch?v={req.videoId}",
            title=req.title,
            channel=req.channel,
            thumbnail_url=req.thumbnailUrl,
            duration_seconds=req.durationSeconds,
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
    )


def _optional_str(value: object) -> str | None:
    return None if value is None else str(value)
