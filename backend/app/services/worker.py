"""
XtractNote — The generation worker

`run_job` takes one job from `pending` to a finished state: it moves the job to
`drafting`, runs the generation, saves the result as a draft row, and links that
row to the job.

It is synchronous because generation is a blocking call, so whoever starts it
runs it on a thread.

**It does not raise.** Nobody is waiting on it, so an escaped exception would
leave the job unfinished with only a log line to show for it. Once the job is
`drafting`, a failure at any later step is recorded on it. When the job cannot
be started, or the failure cannot be written, the reason is logged instead.

**The owner is the `user_id` argument and nothing else.** `GenerationInput`
carries no user, so request data cannot name one.

**The effects are passed in as `Steps`.** By default they are the real job,
generation and draft functions; tests pass stand-ins, which is what lets every
failure branch be exercised without a database or a model call.
"""

import logging
from dataclasses import dataclass
from typing import Any, Callable, Literal

from app.services import drafts, jobs
from app.services.drafts import VideoSource
from app.services.generate import GenerationError, generate_content
from app.services.prompts import ContentType, SocialPlatform

logger = logging.getLogger(__name__)

#: How a run ended. `abandoned` means the job could not be moved to `drafting`,
#: so nothing was generated and the job was left as it was.
Outcome = Literal["completed", "failed", "abandoned"]

UNEXPECTED_CODE = "unexpected"
UNEXPECTED_MESSAGE = "An unexpected error stopped this generation."


@dataclass(frozen=True)
class GenerationInput:
    """What one generation needs. Deliberately has no user field."""

    full_text: str
    content_type: ContentType
    platform: SocialPlatform | None
    video: VideoSource


@dataclass(frozen=True)
class Steps:
    """The effects `run_job` performs, in the order it performs them."""

    advance: Callable[[str, str, str], Any] = jobs.advance
    generate: Callable[
        [str, ContentType, SocialPlatform | None], dict[str, Any]
    ] = generate_content
    insert_draft: Callable[[dict[str, Any]], str] = drafts.insert_draft
    complete: Callable[[str, str, str], Any] = jobs.complete
    fail: Callable[[str, str, str, str], Any] = jobs.fail


def run_job(
    job_id: str,
    user_id: str,
    request: GenerationInput,
    steps: Steps = Steps(),
) -> Outcome:
    """Run one generation for `user_id`'s job, and return how it ended."""

    # A job that cannot move to `drafting` is missing, belongs to someone else,
    # or has already finished. Generating anyway would spend a model call on a
    # run nothing can record. `fail` would be refused for the same reasons, so
    # the job is left alone.
    try:
        steps.advance(job_id, user_id, "drafting")
    except Exception:
        logger.warning("job %s: could not start, nothing generated", job_id, exc_info=True)
        return "abandoned"

    try:
        body = steps.generate(request.full_text, request.content_type, request.platform)
    except GenerationError as exc:
        return _fail(steps, job_id, user_id, exc.code, exc.message)
    except Exception:
        logger.exception("job %s: generation raised unexpectedly", job_id)
        return _fail(steps, job_id, user_id, UNEXPECTED_CODE, UNEXPECTED_MESSAGE)

    try:
        row = drafts.build_draft_row(
            user_id, request.video, request.content_type, request.platform, body
        )
        result_id = steps.insert_draft(row)
    except Exception:
        logger.exception("job %s: the draft could not be saved", job_id)
        return _fail(
            steps, job_id, user_id, "draft-not-saved", "The draft could not be saved."
        )

    # The draft already exists here. If linking it fails, it is kept — it is the
    # user's result, and still reachable from their drafts.
    try:
        steps.complete(job_id, user_id, result_id)
    except Exception:
        logger.exception(
            "job %s: draft %s was saved but could not be linked", job_id, result_id
        )
        return _fail(steps, job_id, user_id, UNEXPECTED_CODE, UNEXPECTED_MESSAGE)

    return "completed"


def _fail(steps: Steps, job_id: str, user_id: str, code: str, message: str) -> Outcome:
    """Record the failure on the job. If that write fails too, log it."""
    try:
        steps.fail(job_id, user_id, code, message)
    except Exception:
        logger.exception("job %s: could not record failure %r", job_id, code)
    return "failed"
