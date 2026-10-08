"""
Job records: the rules layer.

`jobs.py` is split so that what a job may do is decided by pure functions over
strings, with the database writes a thin shell around them. These test the pure
half — no network, no database, nothing mocked.

What they cannot test is the other half, and it is worth being explicit rather
than letting a green suite imply more than it proves: ownership and terminality
are enforced by each statement's own predicate, in SQL. A test here proves the
rules are *defined* correctly. It cannot prove Postgres applied them. The
statement is verified by reading the generated query, and by exercising the
module against the real database.
"""

import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app.services.jobs import (
    CREATION_STATUS,
    INTERRUPTED_CODE,
    INTERRUPTED_MESSAGE,
    LEGAL_STATUSES,
    PROGRESS_BY_STATUS,
    TERMINAL_STATUSES,
    JobError,
    _utc_now_iso,
    advance_target_error,
    failure_code_error,
    interrupted_cutoff,
    interrupted_patch,
    is_legal_status,
    patch_for_status,
    progress_for,
)

MIGRATION = (
    Path(__file__).resolve().parents[2] / "database" / "004_create_jobs.sql"
)


# --- The code and the schema must agree ---------------------------------------


def statuses_in_migration() -> set[str]:
    """The values migration 004's CHECK constraint actually allows."""
    sql = MIGRATION.read_text()
    match = re.search(r"check\s*\(\s*status\s+in\s*\((.*?)\)\s*\)", sql, re.S | re.I)
    assert match, "could not find the status CHECK constraint in migration 004"
    return set(re.findall(r"'([a-z_]+)'", match.group(1)))


def test_legal_statuses_match_the_check_constraint() -> None:
    """
    The vocabulary in code is the vocabulary in the database.

    This is the test most likely to earn its keep. The two are written in
    different files, in different languages, by hand — and a status added to one
    and not the other fails as a constraint violation at runtime, on a write
    that has already been attempted, rather than here.
    """
    assert LEGAL_STATUSES == statuses_in_migration()


def test_cancelled_is_not_a_status() -> None:
    """
    Cancelling needs a migration and does not have one. Stated as its own test
    because expressing a cancelled run as `failed` is the tempting shortcut, and
    it would make the readout lie.
    """
    assert "cancelled" not in LEGAL_STATUSES


def test_terminal_statuses_are_the_two_ends() -> None:
    assert TERMINAL_STATUSES == {"completed", "failed"}


def test_terminal_statuses_are_legal_statuses() -> None:
    """A terminal status the schema rejects would make a job unfinishable."""
    assert TERMINAL_STATUSES <= LEGAL_STATUSES


def test_progress_keys_are_legal_statuses() -> None:
    """A percentage keyed on a status that cannot be written is dead weight."""
    assert set(PROGRESS_BY_STATUS) <= LEGAL_STATUSES


# --- is_legal_status ----------------------------------------------------------


@pytest.mark.parametrize("status", sorted(LEGAL_STATUSES))
def test_every_schema_status_is_legal(status: str) -> None:
    assert is_legal_status(status) is True


@pytest.mark.parametrize(
    "status",
    ["cancelled", "generating", "done", "", "PENDING", "pending ", "unknown"],
    ids=[
        "cancelled",
        "invented-synonym",
        "colloquial",
        "empty",
        "wrong-case",
        "trailing-space",
        "nonsense",
    ],
)
def test_non_schema_statuses_are_rejected(status: str) -> None:
    """
    Case and whitespace are not normalised on purpose. A caller sending
    "PENDING" has a bug, and quietly accepting it would hide it until the value
    reached a reader expecting the lowercase form.
    """
    assert is_legal_status(status) is False


# --- progress_for -------------------------------------------------------------


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        ("pending", 0),
        ("completed", 100),
        ("fetching", None),
        ("reading", None),
        ("understanding", None),
        ("drafting", None),
        ("polishing", None),
        ("failed", None),
    ],
)
def test_progress_only_at_the_ends(status: str, expected: int | None) -> None:
    """
    Only the two ends have a number behind them. Everything in between returns
    None so the stored value is left alone — a percentage for `drafting` would
    be invented, which is the fault the generating screen already has.
    """
    assert progress_for(status) == expected


def test_failed_does_not_reset_progress() -> None:
    """
    A job that fails half way keeps whatever progress it had. Writing 0 would
    claim it never started; writing 100 would claim it finished.
    """
    assert progress_for("failed") is None


# --- patch_for_status ---------------------------------------------------------


def test_patch_sets_status_and_progress_at_the_ends() -> None:
    assert patch_for_status("pending") == {"status": "pending", "progress": 0}
    assert patch_for_status("completed") == {"status": "completed", "progress": 100}


@pytest.mark.parametrize(
    "status", ["fetching", "reading", "understanding", "drafting", "polishing"]
)
def test_patch_omits_progress_in_between(status: str) -> None:
    """
    The key is absent rather than set to None: a patch carrying `progress: None`
    would write a NULL over the previous value, which is worse than leaving it.
    """
    assert patch_for_status(status) == {"status": status}
    assert "progress" not in patch_for_status(status)


def test_patch_for_failed_carries_no_progress() -> None:
    assert patch_for_status("failed") == {"status": "failed"}


@pytest.mark.parametrize("status", ["cancelled", "", "DRAFTING", "nonsense"])
def test_patch_rejects_illegal_status(status: str) -> None:
    """
    Rejected here with a message naming the value, rather than reaching the
    database and coming back as a constraint violation.
    """
    with pytest.raises(JobError) as excinfo:
        patch_for_status(status)
    assert excinfo.value.code == "illegal-status"
    assert status.__repr__() in excinfo.value.message


def test_patch_is_a_fresh_dict_each_call() -> None:
    """
    Callers add `result_id` and the error fields to what they get back. A shared
    dict would leak one job's result id into the next job's patch.
    """
    first = patch_for_status("completed")
    first["result_id"] = "leaked"
    assert "result_id" not in patch_for_status("completed")


# --- advance_target_error -----------------------------------------------------
#
# The reason a terminal status is refused here is not tidiness. `advance` writes
# the status and sometimes a percentage — nothing else. Finishing a job that way
# would leave it `completed` with no `result_id` and no `completed_at`, and
# because every update excludes jobs that have already finished, `complete` could
# never attach them afterwards. The job would be permanently done with nothing to
# show for it.


@pytest.mark.parametrize(
    "status", ["fetching", "reading", "understanding", "drafting", "polishing"]
)
def test_advance_accepts_the_working_stages(status: str) -> None:
    """
    All five are accepted even though no node writes most of them yet. They are
    the vocabulary the schema defines and the pipeline is designed around —
    refusing one for being early would put implementation state into a rules
    module and mean editing this file again for every node that lands.
    """
    assert advance_target_error(status) is None


def test_advance_refuses_the_creation_state() -> None:
    """
    Moving a running job back to `pending` would reset its progress to zero and
    claim it had not started. Nothing legitimate goes backwards: a run that
    stops does so by failing.
    """
    reason = advance_target_error(CREATION_STATUS)
    assert reason is not None
    assert "created in" in reason


@pytest.mark.parametrize("status", sorted(TERMINAL_STATUSES))
def test_advance_refuses_terminal_statuses(status: str) -> None:
    """The job would finish with none of the fields a finished job needs."""
    reason = advance_target_error(status)
    assert reason is not None
    assert "complete()" in reason and "fail()" in reason


@pytest.mark.parametrize("status", ["cancelled", "", "COMPLETED", "nonsense"])
def test_advance_refuses_statuses_outside_the_schema(status: str) -> None:
    assert advance_target_error(status) is not None


def test_the_statuses_partition_into_three_roles() -> None:
    """
    Every status has exactly one role: the state a job is created in, a stage it
    can be advanced to, or an end it finishes at.

    A status in none of them would be unreachable — writable by the schema and
    by nothing in this module. A status in two would be ambiguous about which
    function owns it. Asserting a partition catches both, including for a status
    added later.
    """
    advanceable = {s for s in LEGAL_STATUSES if advance_target_error(s) is None}
    creation = {CREATION_STATUS}

    assert creation | advanceable | TERMINAL_STATUSES == LEGAL_STATUSES
    assert creation & advanceable == set()
    assert advanceable & TERMINAL_STATUSES == set()
    assert creation & TERMINAL_STATUSES == set()


# --- failure_code_error -------------------------------------------------------


@pytest.mark.parametrize(
    "code",
    ["generation-failed", "transcript-too-long", "invalid-structured-output"],
)
def test_failure_code_accepts_real_codes(code: str) -> None:
    assert failure_code_error(code) is None


@pytest.mark.parametrize("code", ["", "   ", "\n", "\t"], ids=["empty", "spaces", "newline", "tab"])
def test_failure_code_refuses_blank(code: str) -> None:
    """
    The screen maps a reason to its copy and there is no copy for "". Only
    emptiness is refused — the codes come from generation, the transcript
    service and later the pipeline's nodes, so a closed list here would be a
    second place to update for every new failure, and the one most likely to be
    forgotten.
    """
    assert failure_code_error(code) is not None


def test_failure_code_does_not_police_the_vocabulary() -> None:
    """
    An unfamiliar code is accepted on purpose. This module owns the job row, not
    the taxonomy of everything that can go wrong upstream of it.
    """
    assert failure_code_error("some-future-pipeline-node-failed") is None


# --- JobError -----------------------------------------------------------------


def test_job_error_carries_code_and_message() -> None:
    """The API layer maps `code`; the screen maps `code`; humans read `message`."""
    error = JobError("job-not-found", "That job does not exist.")
    assert error.code == "job-not-found"
    assert error.message == "That job does not exist."
    assert str(error) == "That job does not exist."


# --- timestamps ---------------------------------------------------------------


def test_completed_at_is_parseable_utc() -> None:
    """
    Sent as a value, not as SQL. A string like "now()" would arrive at Postgres
    as text to parse rather than a function to call, so the timestamp is built
    here and has to be a real one.
    """
    parsed = datetime.fromisoformat(_utc_now_iso())
    assert parsed.tzinfo is not None
    assert parsed.utcoffset().total_seconds() == 0


# --- the restart sweep --------------------------------------------------------

NOW = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc)


def test_the_cutoff_is_the_threshold_before_now() -> None:
    cutoff = datetime.fromisoformat(interrupted_cutoff(NOW, timedelta(minutes=15)))
    assert cutoff == datetime(2026, 10, 8, 11, 45, tzinfo=timezone.utc)


def test_the_cutoff_keeps_its_timezone() -> None:
    """A naive timestamp would be read as local time by whatever compares it."""
    cutoff = datetime.fromisoformat(interrupted_cutoff(NOW, timedelta(minutes=15)))
    assert cutoff.utcoffset() == timedelta(0)


def test_a_swept_job_is_failed_with_the_interrupted_reason() -> None:
    patch = interrupted_patch(NOW)
    assert patch["status"] == "failed"
    assert patch["error_code"] == INTERRUPTED_CODE == "interrupted"
    assert patch["error_message"] == INTERRUPTED_MESSAGE
    assert datetime.fromisoformat(patch["completed_at"]) == NOW


def test_a_swept_job_ends_in_the_same_shape_as_a_failed_one() -> None:
    """
    `fail` writes status, error_code, error_message and completed_at. The sweep
    writes the same columns, so a reader cannot tell the two endings apart by
    which fields are present.
    """
    assert set(interrupted_patch(NOW)) == {
        *patch_for_status("failed"),
        "error_code",
        "error_message",
        "completed_at",
    }


def test_the_interrupted_reason_is_a_usable_failure_code() -> None:
    assert failure_code_error(INTERRUPTED_CODE) is None
