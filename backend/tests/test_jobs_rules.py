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
from datetime import datetime
from pathlib import Path

import pytest

from app.services.jobs import (
    LEGAL_STATUSES,
    PROGRESS_BY_STATUS,
    TERMINAL_STATUSES,
    JobError,
    _utc_now_iso,
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
