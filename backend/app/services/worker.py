"""
XtractNote — The generation worker

`run_job` takes one job from `pending` to a finished state: it claims the job,
moving it to `drafting`, runs the generation, saves the result as a draft row,
and links that row to the job.

It is synchronous because generation is a blocking call, so whoever starts it
runs it on a thread.

**While it runs, it keeps the job's heartbeat going** on a second thread. The
sweep fails jobs whose heartbeat has gone silent, so the heartbeat is what tells
it this run is alive — however long the run takes.

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
import threading
from dataclasses import dataclass
from datetime import timedelta
from types import TracebackType
from typing import Any, Callable, Literal

from app.services import drafts, jobs
from app.services.drafts import VideoSource
from app.services.generate import GenerationError, generate_content
from app.services.prompts import ContentType, SocialPlatform

logger = logging.getLogger(__name__)

#: How a run ended. `abandoned` means the job could not be claimed, so nothing
#: was generated and the job was left as it was.
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
    """The effects `run_job` performs."""

    claim: Callable[[str, str], Any] = jobs.claim
    heartbeat: Callable[[str, str], bool] = jobs.heartbeat
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
    heartbeat_every: timedelta = jobs.HEARTBEAT_EVERY,
) -> Outcome:
    """Run one generation for `user_id`'s job, and return how it ended."""

    # Claiming matches only this user's `pending` job. If it fails, this run
    # does not generate — the job is already someone's run, or nothing could
    # record the result — and the job is left alone.
    try:
        steps.claim(job_id, user_id)
    except Exception:
        logger.warning("job %s: could not start, nothing generated", job_id, exc_info=True)
        return "abandoned"

    with Heartbeat(lambda: steps.heartbeat(job_id, user_id), heartbeat_every, job_id):
        return _run_claimed(job_id, user_id, request, steps)


def _run_claimed(
    job_id: str, user_id: str, request: GenerationInput, steps: Steps
) -> Outcome:
    """Everything after the claim: generate, save the draft, complete."""
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


class Heartbeat:
    """
    Calls `beat` every `every` on a background thread, for the life of a `with`.

    A beat that raises is logged and the next one still runs: one dropped
    request must not end a live run. A beat that returns False — no unfinished
    job matched — stops the beating, since there is nothing left to keep alive.
    """

    def __init__(self, beat: Callable[[], bool], every: timedelta, job_id: str) -> None:
        self._beat = beat
        self._every = every.total_seconds()
        self._job_id = job_id
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._loop, daemon=True)

    def __enter__(self) -> "Heartbeat":
        self._thread.start()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self._stop.set()
        # Bounded, so a beat stuck on the network cannot hold the run open. A
        # beat that lands after the run has finished the job matches nothing.
        self._thread.join(timeout=self._every)

    def _loop(self) -> None:
        while not self._stop.wait(self._every):
            try:
                if not self._beat():
                    logger.warning(
                        "job %s: heartbeat found no unfinished job; stopped beating",
                        self._job_id,
                    )
                    return
            except Exception:
                logger.warning("job %s: heartbeat failed", self._job_id, exc_info=True)
