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
from datetime import timedelta
from typing import Any

import pytest

from app.services.drafts import VideoSource
from app.services.generate import GenerationError
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

REQUEST = GenerationInput(
    full_text="A transcript about tides.",
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
    Stand-ins for the six effects. Each call is recorded by name and
    arguments; `raises` names the steps that should raise, and with what.

    `generate_takes` makes generation slow enough for heartbeats to land, and
    `job_still_open` is what the heartbeat reports back.
    """

    def __init__(
        self,
        raises: dict[str, Exception] | None = None,
        generate_takes: float = 0.0,
        job_still_open: bool = True,
    ) -> None:
        self.calls: list[tuple[str, tuple[Any, ...]]] = []
        self.raises = raises or {}
        self.generate_takes = generate_takes
        self.job_still_open = job_still_open

    def _call(self, name: str, *args: Any) -> None:
        self.calls.append((name, args))
        if name in self.raises:
            raise self.raises[name]

    def steps(self) -> Steps:
        def claim(job_id: str, user_id: str) -> None:
            self._call("claim", job_id, user_id)

        def heartbeat(job_id: str, user_id: str) -> bool:
            self._call("heartbeat", job_id, user_id)
            return self.job_still_open

        def generate(full_text: str, content_type: Any, platform: Any) -> dict[str, Any]:
            self._call("generate", full_text, content_type, platform)
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
            generate=generate,
            insert_draft=insert_draft,
            complete=complete,
            fail=fail,
        )

    @property
    def names(self) -> list[str]:
        """The calls in order, heartbeats left out — they land on their own clock."""
        return [name for name, _ in self.calls if name != "heartbeat"]

    @property
    def beats(self) -> int:
        return sum(1 for name, _ in self.calls if name == "heartbeat")

    def args(self, name: str) -> tuple[Any, ...]:
        matches = [args for call, args in self.calls if call == name]
        assert len(matches) == 1, f"expected one {name} call, got {len(matches)}"
        return matches[0]


def run(raises: dict[str, Exception] | None = None) -> tuple[str, Recorder]:
    recorder = Recorder(raises)
    return run_job(JOB, USER, REQUEST, recorder.steps()), recorder


# --- The defaults are the real effects ----------------------------------------


def test_default_steps_are_the_real_functions() -> None:
    """
    Every test below passes stand-ins, so none of them would notice a default
    being something other than the real function. This one would.
    """
    from app.services import drafts, jobs
    from app.services.generate import generate_content

    steps = Steps()
    assert steps.claim is jobs.claim
    assert steps.heartbeat is jobs.heartbeat
    assert steps.generate is generate_content
    assert steps.insert_draft is drafts.insert_draft
    assert steps.complete is jobs.complete
    assert steps.fail is jobs.fail


# --- The path that works ------------------------------------------------------


def test_a_run_claims_then_generates_then_saves_then_completes() -> None:
    outcome, recorder = run()
    assert outcome == "completed"
    assert recorder.names == ["claim", "generate", "insert_draft", "complete"]


def test_the_job_is_claimed_before_anything_is_spent() -> None:
    _, recorder = run()
    assert recorder.args("claim") == (JOB, USER)


def test_generation_receives_the_request_unchanged() -> None:
    _, recorder = run()
    assert recorder.args("generate") == (REQUEST.full_text, "social", "linkedin")


def test_the_draft_belongs_to_the_given_user_and_holds_the_result() -> None:
    _, recorder = run()
    (row,) = recorder.args("insert_draft")
    assert row["user_id"] == USER
    assert row["status"] == "draft"
    assert row["content_body"] is BODY
    assert row["metadata"] == {"platform": "linkedin"}


def test_the_job_is_completed_with_the_draft_it_produced() -> None:
    _, recorder = run()
    assert recorder.args("complete") == (JOB, USER, DRAFT)


def test_every_job_write_uses_the_same_owner() -> None:
    _, recorder = run()
    for name in ("claim", "complete"):
        assert recorder.args(name)[1] == USER


# --- A job that cannot be claimed ---------------------------------------------


def test_a_job_that_cannot_be_claimed_spends_nothing_and_is_left_alone() -> None:
    outcome, recorder = run({"claim": RuntimeError("job-not-claimed")})
    assert outcome == "abandoned"
    assert recorder.names == ["claim"]


# --- Failures after the job has started ---------------------------------------


def test_a_generation_error_is_recorded_with_its_own_code() -> None:
    error = GenerationError("transcript-too-long", "Too long.")
    outcome, recorder = run({"generate": error})
    assert outcome == "failed"
    assert recorder.names == ["claim", "generate", "fail"]
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
    assert recorder.names == ["claim", "generate", "insert_draft", "fail"]
    assert recorder.args("fail")[2] == "draft-not-saved"


def test_a_draft_that_cannot_be_linked_is_kept_and_the_job_fails() -> None:
    outcome, recorder = run({"complete": RuntimeError("network")})
    assert outcome == "failed"
    assert recorder.names == ["claim", "generate", "insert_draft", "complete", "fail"]
    assert recorder.args("fail")[2] == UNEXPECTED_CODE


# --- It never raises ----------------------------------------------------------


@pytest.mark.parametrize("failing_step", ["generate", "insert_draft", "complete"])
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
