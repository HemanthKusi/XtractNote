"""
XtractNote — The generation worker

`run_job` takes one job from `pending` to a finished state. It claims the job,
which enters the generation graph's first stage, then runs the graph
(`app.agents.graph`). As each node starts, the job enters that node's stage —
with the time it did, and the transcript the run is reading once it has one.
The graph's result is saved as a draft row and linked to the job.

It is synchronous because generation is a blocking call, so whoever starts it
runs it on a thread.

**While it runs, it keeps the job's heartbeat going** on a second thread.

**A run stops when its job finishes under it.** Entering a stage matches only
an unfinished job, so a job the sweep has already failed stops the run as it
enters its next stage, before that stage's node runs; and the job is checked
again before the draft is saved.
A stopped run writes nothing more — the job already says how it ended.

**It does not raise.** Nobody is waiting on it, so an escaped exception would
leave the job unfinished with only a log line to show for it. Once the job is
claimed, a failure at any later step is recorded on it. When the job cannot
be started, or the failure cannot be written, the reason is logged instead.

**The owner is the `user_id` argument and nothing else.** `GenerationInput`
and the graph's state carry no user, so request data cannot name one.

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

from app.agents.graph import GRAPH, NODE_STAGES
from app.agents.state import NodeEffects, run_config
from app.config import settings
from app.services import drafts, jobs, transcript_store
from app.services.drafts import VideoSource
from app.services.generate import GenerationError, generate_content
from app.services.prompts import ContentType, SocialPlatform
from app.services.transcript import TranscriptServiceError
from app.services.transcript_store import StoredTranscript

logger = logging.getLogger(__name__)

#: How a run ended. `abandoned` means the job could not be claimed, so nothing
#: was generated and the job was left as it was. `stopped` means the job
#: finished under the run — the sweep failed it — and the run wrote nothing more.
Outcome = Literal["completed", "failed", "abandoned", "stopped"]

UNEXPECTED_CODE = "unexpected"
UNEXPECTED_MESSAGE = "An unexpected error stopped this generation."


def obtain_transcript(video_id: str) -> StoredTranscript:
    """The video's transcript, reused while `transcript_reuse_days` allows."""
    return transcript_store.obtain(
        video_id, timedelta(days=settings.transcript_reuse_days)
    )


@dataclass(frozen=True)
class GenerationInput:
    """
    What one generation needs. Deliberately has no user field, and no
    transcript: the run obtains that itself from the video id.
    """

    content_type: ContentType
    platform: SocialPlatform | None
    video: VideoSource


@dataclass(frozen=True)
class Steps:
    """The effects `run_job` performs."""

    claim: Callable[[str, str], Any] = jobs.claim
    heartbeat: Callable[[str, str], bool] = jobs.heartbeat
    enter_stage: Callable[[str, str, str, dict[str, str], str | None], Any] = jobs.enter_stage
    obtain_transcript: Callable[[str], StoredTranscript] = obtain_transcript
    generate: Callable[
        [str, ContentType, SocialPlatform | None], dict[str, Any]
    ] = generate_content
    is_unfinished: Callable[[str, str], bool] = jobs.is_unfinished
    insert_draft: Callable[[dict[str, Any]], str] = drafts.insert_draft
    complete: Callable[[str, str, str], Any] = jobs.complete
    fail: Callable[[str, str, str, str], Any] = jobs.fail
    now: Callable[[], str] = jobs.utc_now_iso


class _Stopped(Exception):
    """The job finished under the run. Nothing more is written to it."""


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
        claimed = steps.claim(job_id, user_id)
    except Exception:
        logger.warning("job %s: could not start, nothing generated", job_id, exc_info=True)
        return "abandoned"

    with Heartbeat(lambda: steps.heartbeat(job_id, user_id), heartbeat_every, job_id):
        return _run_claimed(job_id, user_id, request, steps, _stage_times(claimed))


def _stage_times(claimed: Any) -> dict[str, str]:
    """The stage times `claim` recorded, or none if its row carries none."""
    times = claimed.get("stage_started_at") if isinstance(claimed, dict) else None
    if not isinstance(times, dict):
        return {}
    return {stage: at for stage, at in times.items() if isinstance(stage, str) and isinstance(at, str)}


def _run_claimed(
    job_id: str,
    user_id: str,
    request: GenerationInput,
    steps: Steps,
    stage_times: dict[str, str],
) -> Outcome:
    """Everything after the claim: the graph, the draft, completion."""
    try:
        final = _run_graph(job_id, user_id, request, steps, stage_times)
    except _Stopped:
        # Worth seeing: a job failed under a run that was still going is the
        # race #429 describes.
        logger.warning("job %s: finished under its run, which stopped", job_id)
        return "stopped"
    except TranscriptServiceError as exc:
        return _fail(steps, job_id, user_id, exc.code, str(exc))
    except GenerationError as exc:
        return _fail(steps, job_id, user_id, exc.code, exc.message)
    except Exception:
        logger.exception("job %s: the generation graph raised unexpectedly", job_id)
        return _fail(steps, job_id, user_id, UNEXPECTED_CODE, UNEXPECTED_MESSAGE)

    body = final.get("body")
    transcript = final.get("transcript")
    if not isinstance(body, dict) or not isinstance(transcript, StoredTranscript):
        logger.error("job %s: the graph finished without a body and transcript", job_id)
        return _fail(steps, job_id, user_id, UNEXPECTED_CODE, UNEXPECTED_MESSAGE)

    # A job failed while the last node ran gets no draft: it would be linked
    # to nothing. If the check itself cannot be made, the draft is saved
    # anyway — keeping a result that was paid for beats losing it to a read.
    try:
        unfinished = steps.is_unfinished(job_id, user_id)
    except Exception:
        logger.warning("job %s: could not check the job before saving", job_id, exc_info=True)
        unfinished = True
    if not unfinished:
        logger.warning("job %s: finished under its run; its result is not saved", job_id)
        return "stopped"

    try:
        row = drafts.build_draft_row(
            user_id,
            request.video,
            request.content_type,
            request.platform,
            body,
            transcript_id=transcript.id,
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


def _run_graph(
    job_id: str,
    user_id: str,
    request: GenerationInput,
    steps: Steps,
    stage_times: dict[str, str],
) -> dict[str, Any]:
    """
    Run the generation graph and return its final state.

    Each node's start event enters its stage before the node runs. Raises
    _Stopped when the job is no longer unfinished — the stream is closed, so
    that node never runs — and lets a node's own exception through unchanged.
    """
    effects = NodeEffects(obtain_transcript=steps.obtain_transcript, generate=steps.generate)
    state = {
        "video_id": request.video.video_id,
        "content_type": request.content_type,
        "platform": request.platform,
    }
    current = jobs.CLAIM_STATUS
    final: dict[str, Any] | None = None
    run = GRAPH.stream(state, config=run_config(effects), stream_mode=["tasks", "values"])
    try:
        for mode, chunk in run:
            if mode == "values":
                final = chunk
            elif mode == "tasks" and "input" in chunk:
                stage = NODE_STAGES[chunk["name"]]
                if stage == current:
                    continue
                stage_times = {**stage_times, stage: steps.now()}
                transcript = chunk["input"].get("transcript")
                transcript_id = transcript.id if isinstance(transcript, StoredTranscript) else None
                try:
                    steps.enter_stage(job_id, user_id, stage, stage_times, transcript_id)
                except jobs.JobError as exc:
                    if exc.code == "job-not-updated":
                        raise _Stopped(stage) from exc
                    raise
                current = stage
    finally:
        run.close()
    if final is None:
        raise RuntimeError("the generation graph produced no state")
    return final


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
