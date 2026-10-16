"""
The generation worker: every path through `run_job`.

`run_job` takes its effects as a `Steps` object, so these tests pass stand-ins
that record each call and can be told to raise. No database, no model call.

What they prove is the ORDER of the calls and which failure code each branch
records. They cannot prove the real functions behave — that `complete` refuses
another user's draft, say. That is `jobs.py`'s own tests and the run against the
real database.
"""

import time
from dataclasses import replace
from datetime import timedelta
from typing import Any

import pytest

from app.agents.analysis import analyse_sections
from app.agents.graph import NODES
from app.services import jobs
from app.services.drafts import VideoSource
from app.services.generate import GenerationError
from app.agents.outline import Outline, Topic
from app.agents.prompts.draft import guidance_for
from app.services.transcript import (
    TranscriptSegment,
    TranscriptBlockedError,
    TranscriptServiceError,
    TranscriptUnavailableError,
    VideoNotFoundError,
)
from app.services.transcript_store import StoredTranscript
from app.services.worker import (
    UNEXPECTED_CODE,
    UNEXPECTED_MESSAGE,
    GenerationInput,
    Steps,
    run_job,
)

JOB = "job-1"
USER = "user-1"
DRAFT = "draft-1"
BODY = {"markdown": "Tides follow the moon."}
TRANSCRIPT = StoredTranscript(
    id="transcript-1",
    full_text="A transcript about tides.",
    word_count=4,
    segments=(TranscriptSegment(text="A transcript about tides.", start=0.0, duration=3.0),),
)
OUTLINE = Outline(
    thesis="Tides follow the moon.",
    topics=(Topic(heading="Tides", points=("The moon pulls the sea.",), sections=(0,)),),
    key_terms=(),
)

REQUEST = GenerationInput(
    content_type="social",
    platform="linkedin",
    video=VideoSource(
        video_id="dQw4w9WgXcQ",
        url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title="How tides work",
        channel="Ocean Notes",
        thumbnail_url="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        duration_seconds=754,
    ),
)


class Recorder:
    """
    Stand-ins for the effects. Each call is recorded by name and arguments;
    `raises` names the steps that should raise, and with what.

    `generate_takes` makes generation slow enough for heartbeats to land,
    `job_still_open` is what the heartbeat reports back, `unfinished_before_save`
    is what the check before saving reports, and `claimed` is the row `claim`
    returns. The clock hands out t1, t2, … in order.
    """

    def __init__(
        self,
        raises: dict[str, Exception] | None = None,
        generate_takes: float = 0.0,
        job_still_open: bool = True,
        unfinished_before_save: bool = True,
        claimed: Any = None,
    ) -> None:
        self.calls: list[tuple[str, tuple[Any, ...]]] = []
        self.raises = raises or {}
        self.generate_takes = generate_takes
        self.job_still_open = job_still_open
        self.unfinished_before_save = unfinished_before_save
        self.claimed = {"stage_started_at": {"fetching": "t0"}} if claimed is None else claimed
        self.ticks = 0

    def _call(self, name: str, *args: Any) -> None:
        self.calls.append((name, args))
        if name in self.raises:
            raise self.raises[name]

    def steps(self) -> Steps:
        def claim(job_id: str, user_id: str) -> Any:
            self._call("claim", job_id, user_id)
            return self.claimed

        def heartbeat(job_id: str, user_id: str) -> bool:
            self._call("heartbeat", job_id, user_id)
            return self.job_still_open

        def obtain_transcript(video_id: str) -> StoredTranscript:
            self._call("obtain_transcript", video_id)
            return TRANSCRIPT

        def enter_stage(
            job_id: str, user_id: str, status: str, stage_started_at: dict[str, str], transcript_id: str | None
        ) -> None:
            self._call("enter_stage", job_id, user_id, status, dict(stage_started_at), transcript_id)

        def is_unfinished(job_id: str, user_id: str) -> bool:
            self._call("is_unfinished", job_id, user_id)
            return self.unfinished_before_save

        def now() -> str:
            self.ticks += 1
            return f"t{self.ticks}"

        def analyse(sections: Any) -> Outline:
            self._call("analyse", tuple(section.index for section in sections))
            return OUTLINE

        def generate(material: str, content_type: Any, platform: Any, guidance: str) -> dict[str, Any]:
            self._call("generate", material, content_type, platform, guidance)
            time.sleep(self.generate_takes)
            return BODY

        def insert_draft(row: dict[str, Any]) -> str:
            self._call("insert_draft", row)
            return DRAFT

        def complete(job_id: str, user_id: str, result_id: str) -> None:
            self._call("complete", job_id, user_id, result_id)

        def fail(job_id: str, user_id: str, code: str, message: str) -> None:
            self._call("fail", job_id, user_id, code, message)

        return Steps(
            claim=claim,
            heartbeat=heartbeat,
            enter_stage=enter_stage,
            obtain_transcript=obtain_transcript,
            analyse=analyse,
            generate=generate,
            is_unfinished=is_unfinished,
            insert_draft=insert_draft,
            complete=complete,
            fail=fail,
            now=now,
        )

    @property
    def names(self) -> list[str]:
        """The calls in order, heartbeats left out — they land on their own clock."""
        return [name for name, _ in self.calls if name != "heartbeat"]

    @property
    def beats(self) -> int:
        return sum(1 for name, _ in self.calls if name == "heartbeat")

    def all_args(self, name: str) -> list[tuple[Any, ...]]:
        return [args for call, args in self.calls if call == name]

    def args(self, name: str) -> tuple[Any, ...]:
        matches = [args for call, args in self.calls if call == name]
        assert len(matches) == 1, f"expected one {name} call, got {len(matches)}"
        return matches[0]


def run(raises: dict[str, Exception] | None = None, **options: Any) -> tuple[str, Recorder]:
    recorder = Recorder(raises, **options)
    return run_job(JOB, USER, REQUEST, recorder.steps()), recorder


# --- The defaults are the real effects ----------------------------------------


def test_default_steps_are_the_real_functions() -> None:
    """
    Every test below passes stand-ins, so none of them would notice a default
    being something other than the real function. This one would.
    """
    from app.services import drafts, jobs, worker
    from app.services.generate import generate_content

    steps = Steps()
    assert steps.claim is jobs.claim
    assert steps.heartbeat is jobs.heartbeat
    assert steps.obtain_transcript is worker.obtain_transcript
    assert steps.enter_stage is jobs.enter_stage
    assert steps.analyse is analyse_sections
    assert steps.is_unfinished is jobs.is_unfinished
    assert steps.now is jobs.utc_now_iso
    assert steps.generate is generate_content
    assert steps.insert_draft is drafts.insert_draft
    assert steps.complete is jobs.complete
    assert steps.fail is jobs.fail


# --- The path that works ------------------------------------------------------


FULL_PATH = [
    "claim",
    "obtain_transcript",
    "enter_stage",  # reading, as `segment` starts
    "enter_stage",  # understanding, as `analyse` starts
    "analyse",
    "enter_stage",  # drafting, as `draft` starts
    "generate",
    "is_unfinished",
    "insert_draft",
    "complete",
]


def test_claiming_enters_the_graphs_first_stage() -> None:
    """`fetch` starts in the stage `claim` wrote, so its start writes nothing."""
    assert NODES[0][2] == jobs.CLAIM_STATUS


def test_a_run_claims_reads_sections_analyses_drafts_saves_and_completes() -> None:
    outcome, recorder = run()
    assert outcome == "completed"
    assert recorder.names == FULL_PATH


def test_the_transcript_is_obtained_for_the_requested_video() -> None:
    _, recorder = run()
    assert recorder.args("obtain_transcript") == (REQUEST.video.video_id,)


def test_each_stage_is_entered_in_order_with_its_time_and_the_transcript() -> None:
    _, recorder = run()
    assert recorder.all_args("enter_stage") == [
        (JOB, USER, "reading", {"fetching": "t0", "reading": "t1"}, TRANSCRIPT.id),
        (JOB, USER, "understanding", {"fetching": "t0", "reading": "t1", "understanding": "t2"}, TRANSCRIPT.id),
        (
            JOB,
            USER,
            "drafting",
            {"fetching": "t0", "reading": "t1", "understanding": "t2", "drafting": "t3"},
            TRANSCRIPT.id,
        ),
    ]


@pytest.mark.parametrize("claimed", [{}, "not a row", {"stage_started_at": "nonsense"}])
def test_a_claim_without_readable_stage_times_starts_the_record_empty(claimed: Any) -> None:
    _, recorder = run(claimed=claimed)
    assert recorder.all_args("enter_stage")[0][3] == {"reading": "t1"}


def test_analysis_reads_the_transcripts_sections() -> None:
    _, recorder = run()
    assert recorder.args("analyse") == ((0,),)


def test_the_job_is_claimed_before_anything_is_spent() -> None:
    _, recorder = run()
    assert recorder.args("claim") == (JOB, USER)


def test_generation_reads_the_outline_and_sections_with_its_guidance() -> None:
    _, recorder = run()
    material, content_type, platform, guidance = recorder.args("generate")
    assert (content_type, platform, guidance) == ("social", "linkedin", guidance_for("social", OUTLINE.register))
    assert "Tides follow the moon." in material and TRANSCRIPT.full_text in material


def test_the_draft_belongs_to_the_given_user_and_holds_the_result() -> None:
    _, recorder = run()
    (row,) = recorder.args("insert_draft")
    assert row["user_id"] == USER
    assert row["status"] == "draft"
    assert row["content_body"] is BODY
    assert row["metadata"]["platform"] == "linkedin"
    assert row["metadata"]["outline"]["thesis"] == "Tides follow the moon."
    assert row["metadata"]["outline"]["topics"][0]["sections"] == [{"index": 0, "start": 0.0, "end": 3.0}]
    assert row["transcript_id"] == TRANSCRIPT.id


def test_the_job_is_completed_with_the_draft_it_produced() -> None:
    _, recorder = run()
    assert recorder.args("complete") == (JOB, USER, DRAFT)


def test_every_job_write_uses_the_same_owner() -> None:
    _, recorder = run()
    for name in ("claim", "enter_stage", "is_unfinished", "complete"):
        assert all(args[1] == USER for args in recorder.all_args(name))


# --- A job that cannot be claimed ---------------------------------------------


def test_a_job_that_cannot_be_claimed_spends_nothing_and_is_left_alone() -> None:
    outcome, recorder = run({"claim": RuntimeError("job-not-claimed")})
    assert outcome == "abandoned"
    assert recorder.names == ["claim"]


# --- Failures after the job has started ---------------------------------------


@pytest.mark.parametrize(
    "error",
    [
        TranscriptUnavailableError("No captions."),
        VideoNotFoundError("Gone."),
        TranscriptBlockedError("Blocked."),
        TranscriptServiceError("Something else."),
    ],
)
def test_a_transcript_failure_is_recorded_with_its_own_code_and_nothing_is_spent(
    error: TranscriptServiceError,
) -> None:
    outcome, recorder = run({"obtain_transcript": error})
    assert outcome == "failed"
    assert recorder.names == ["claim", "obtain_transcript", "fail"]
    assert recorder.args("fail") == (JOB, USER, error.code, str(error))


def test_any_other_transcript_exception_is_unexpected() -> None:
    outcome, recorder = run({"obtain_transcript": RuntimeError("database down")})
    assert outcome == "failed"
    assert recorder.args("fail") == (JOB, USER, UNEXPECTED_CODE, UNEXPECTED_MESSAGE)


def test_a_job_failed_under_the_run_stops_it_before_anything_is_spent() -> None:
    """The sweep failed it: entering the next stage matches nothing, so nothing is analysed, generated or written."""
    swept = jobs.JobError("job-not-updated", "That job does not exist, or has already finished.")
    outcome, recorder = run({"enter_stage": swept})
    assert outcome == "stopped"
    assert recorder.names == ["claim", "obtain_transcript", "enter_stage"]


def test_a_stage_that_cannot_be_written_fails_the_job_and_generates_nothing() -> None:
    outcome, recorder = run({"enter_stage": RuntimeError("database down")})
    assert outcome == "failed"
    assert recorder.names == ["claim", "obtain_transcript", "enter_stage", "fail"]
    assert recorder.args("fail")[2] == UNEXPECTED_CODE


def test_a_job_failed_while_drafting_gets_no_draft() -> None:
    """Its draft would be linked to nothing."""
    outcome, recorder = run(unfinished_before_save=False)
    assert outcome == "stopped"
    assert recorder.names == FULL_PATH[:8]


def test_a_failed_analysis_is_recorded_with_its_code_and_nothing_is_drafted() -> None:
    error = GenerationError("analysis-failed", "The analysis was unusable.")
    outcome, recorder = run({"analyse": error})
    assert outcome == "failed"
    assert recorder.names == FULL_PATH[:5] + ["fail"]
    assert recorder.args("fail")[2] == "analysis-failed"


def test_a_check_before_saving_that_cannot_be_made_still_saves_the_result() -> None:
    """A paid result is kept rather than lost to a failed read."""
    outcome, recorder = run({"is_unfinished": RuntimeError("database down")})
    assert outcome == "completed"
    assert recorder.names == FULL_PATH


def test_a_generation_that_returns_no_body_is_unexpected() -> None:
    recorder = Recorder()

    def nothing(material: str, content_type: Any, platform: Any, guidance: str) -> Any:
        return None

    outcome = run_job(JOB, USER, REQUEST, replace(recorder.steps(), generate=nothing))
    assert outcome == "failed"
    assert recorder.args("fail")[2] == UNEXPECTED_CODE
    assert "insert_draft" not in recorder.names


def test_a_generation_error_is_recorded_with_its_own_code() -> None:
    error = GenerationError("transcript-too-long", "Too long.")
    outcome, recorder = run({"generate": error})
    assert outcome == "failed"
    assert recorder.names == FULL_PATH[:7] + ["fail"]
    assert recorder.args("fail") == (JOB, USER, "transcript-too-long", "Too long.")


def test_any_other_generation_exception_is_unexpected() -> None:
    outcome, recorder = run({"generate": ValueError("provider exploded")})
    assert outcome == "failed"
    assert recorder.args("fail") == (JOB, USER, UNEXPECTED_CODE, UNEXPECTED_MESSAGE)


def test_an_unexpected_failure_does_not_store_the_exception_text() -> None:
    _, recorder = run({"generate": ValueError("secret-ish internals")})
    message = recorder.args("fail")[3]
    assert "secret-ish internals" not in message


def test_a_draft_that_cannot_be_saved_is_recorded_and_nothing_is_completed() -> None:
    outcome, recorder = run({"insert_draft": RuntimeError("insert returned nothing")})
    assert outcome == "failed"
    assert recorder.names == FULL_PATH[:9] + ["fail"]
    assert recorder.args("fail")[2] == "draft-not-saved"


def test_a_draft_that_cannot_be_linked_is_kept_and_the_job_fails() -> None:
    outcome, recorder = run({"complete": RuntimeError("network")})
    assert outcome == "failed"
    assert recorder.names == FULL_PATH + ["fail"]
    assert recorder.args("fail")[2] == UNEXPECTED_CODE


# --- It never raises ----------------------------------------------------------


@pytest.mark.parametrize(
    "failing_step",
    ["obtain_transcript", "enter_stage", "analyse", "generate", "insert_draft", "complete"],
)
def test_a_failure_that_cannot_be_recorded_still_does_not_raise(failing_step: str) -> None:
    outcome, recorder = run(
        {failing_step: RuntimeError("step failed"), "fail": RuntimeError("db down")}
    )
    assert outcome == "failed"
    assert recorder.names[-1] == "fail"


# --- The heartbeat ------------------------------------------------------------

BEAT = timedelta(milliseconds=10)


def beating_run(**recorder_options: Any) -> tuple[str, Recorder]:
    """A run whose generation takes long enough for several beats to land."""
    recorder = Recorder(generate_takes=BEAT.total_seconds() * 10, **recorder_options)
    outcome = run_job(JOB, USER, REQUEST, recorder.steps(), heartbeat_every=BEAT)
    return outcome, recorder


def test_a_running_job_keeps_its_heartbeat_going() -> None:
    outcome, recorder = beating_run()
    assert outcome == "completed"
    assert recorder.beats >= 2


def test_the_heartbeat_names_this_users_job() -> None:
    _, recorder = beating_run()
    beats = {args for name, args in recorder.calls if name == "heartbeat"}
    assert beats == {(JOB, USER)}


def test_the_heartbeat_stops_when_the_run_ends() -> None:
    _, recorder = beating_run()
    after_run = recorder.beats
    time.sleep(BEAT.total_seconds() * 5)
    assert recorder.beats == after_run


def test_a_failing_beat_does_not_stop_the_run_or_the_next_beat() -> None:
    outcome, recorder = beating_run(raises={"heartbeat": RuntimeError("db blip")})
    assert outcome == "completed"
    assert recorder.beats >= 2


def test_a_beat_that_finds_the_job_finished_stops_beating() -> None:
    outcome, recorder = beating_run(job_still_open=False)
    assert outcome == "completed"
    assert recorder.beats == 1


def test_a_job_that_cannot_be_claimed_never_beats() -> None:
    recorder = Recorder(raises={"claim": RuntimeError("job-not-claimed")})
    run_job(JOB, USER, REQUEST, recorder.steps(), heartbeat_every=BEAT)
    time.sleep(BEAT.total_seconds() * 5)
    assert recorder.beats == 0
