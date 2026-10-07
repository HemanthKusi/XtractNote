"""
XtractNote — Job records

The module that owns `generation_jobs` within this service. It creates the row,
moves it through its states, and reads it back, and nothing else in the backend
writes to that table.

**That is a convention here, not a guarantee from the database.** Migration 005
grants users insert and update policies on this table, so a client holding the
anon key can write to it directly without going through anything here.

It does no generation, fetches no transcript, and makes no HTTP call.

**Nothing calls this module yet.** Generation still runs on the request; there is
no worker, no polling endpoint, and no job id handed back. The intent is that a
worker and, later, the pipeline's nodes report *through* here rather than
touching the table themselves, so the rules about what a job may do stay in one
place — but none of that exists, and `generation_jobs` stays empty until it does.

**Two layers, deliberately.** The rules — which statuses exist, what each one
writes — are pure functions over strings, testable without a database. The
writes are a thin shell around them.

**The backend holds the service-role key, which bypasses row-level security
entirely.** The policies on this table never fire for anything here. Ownership
therefore goes into every statement's own predicate rather than being checked
afterwards: by the time a row count comes back, the write has already happened.
"""

from datetime import datetime, timezone
from typing import Any

from app.db.supabase import get_supabase_client

TABLE = "generation_jobs"
CONTENT_TABLE = "generated_content"


# --- Typed error --------------------------------------------------------------

class JobError(Exception):
    """
    Raised when a job operation cannot be performed. `code` is a stable string
    the API layer maps to an HTTP status and the generating screen maps to its
    own copy — the same pattern as GenerationError.
    """

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


# --- The vocabulary -----------------------------------------------------------

#: Exactly the eight values migration 004's CHECK constraint allows. Writing
#: anything else is rejected by the database, so it is rejected here first —
#: with a message naming the bad value, rather than a constraint violation.
#:
#: There is no `cancelled`. Cancelling a run is its own work and needs a
#: migration; expressing it as `failed` would be a readout that lies.
LEGAL_STATUSES: frozenset[str] = frozenset(
    {
        "pending",
        "fetching",
        "reading",
        "understanding",
        "drafting",
        "polishing",
        "completed",
        "failed",
    }
)

#: The state a job is created in. `create_job` writes it as part of the insert,
#: and `advance` refuses it: moving a running job back to `pending` would reset
#: its progress to zero and claim it had not started.
CREATION_STATUS = "pending"

#: Once a job reaches one of these it is finished and nothing moves it again.
#: The guard matters because an abandoned run finishes anyway — the user has
#: navigated away and nobody is waiting, but its late write would otherwise
#: overwrite the truth with a result nobody asked for.
TERMINAL_STATUSES: frozenset[str] = frozenset({"completed", "failed"})

#: Statuses it is honest to write a percentage for: **only the ends**. A number
#: for `drafting` would be invented, since nothing underneath is measuring it —
#: which is the problem the generating screen already has with its clock. The
#: intermediate stages get real values when the pipeline's nodes exist and
#: position within it means something.
PROGRESS_BY_STATUS: dict[str, int] = {"pending": 0, "completed": 100}


# --- Pure rules ---------------------------------------------------------------

def is_legal_status(status: str) -> bool:
    """True if `status` is one of the eight the schema accepts."""
    return status in LEGAL_STATUSES


def progress_for(status: str) -> int | None:
    """
    The percentage to store for `status`, or None to leave the column alone.

    None is the common case and the honest one: most stages have no measured
    progress behind them, so the stored value is left as it was and the screen
    can show an indeterminate state rather than a number that was made up.
    """
    return PROGRESS_BY_STATUS.get(status)


def patch_for_status(status: str) -> dict[str, Any]:
    """
    The column values a move to `status` writes.

    Pure, and the single place that decides whether `progress` is touched, so a
    percentage cannot be invented in one code path and not another.

    Raises JobError("illegal-status") for anything outside the schema's
    vocabulary. Terminality is NOT checked here — it cannot be, without reading
    the row first, and reading before writing leaves a window in which the job
    finishes between the two. That guard belongs in the statement.
    """
    if not is_legal_status(status):
        raise JobError("illegal-status", f"{status!r} is not a job status.")

    patch: dict[str, Any] = {"status": status}
    progress = progress_for(status)
    if progress is not None:
        patch["progress"] = progress
    return patch


def advance_target_error(status: str) -> str | None:
    """
    Why `status` is not a valid target for `advance`, or None if it is.

    **A terminal status is rejected here even though the schema allows it.**
    `advance` writes only the status and sometimes a percentage, so finishing a
    job this way would leave it `completed` with no `result_id` and no
    `completed_at` — and because every update excludes jobs that have already
    finished, `complete` could never attach them afterwards. The job would be
    permanently done with nothing to show for it.

    Finishing goes through `complete` or `fail`, which write the whole set of
    fields a finished job needs.

    **The creation state is rejected too.** A job moved back to `pending` would
    have its progress reset to zero, claiming it had not started — and nothing
    legitimate goes backwards, since a run that stops does so by failing.

    The remaining stages are accepted even though no node writes them yet. They
    are the vocabulary the schema defines and the pipeline is designed around;
    refusing one for being early would put implementation state into a rules
    module, where it goes stale and has to be edited again for every node that
    lands.
    """
    if not is_legal_status(status):
        return f"{status!r} is not a job status."
    if status == CREATION_STATUS:
        return (
            f"{status!r} is the state a job is created in, not somewhere to "
            "move it back to."
        )
    if status in TERMINAL_STATUSES:
        return (
            f"{status!r} is terminal — use complete() or fail(), so the row "
            "carries the fields a finished job needs."
        )
    return None


def failure_code_error(code: str) -> str | None:
    """
    Why `code` is not usable as a failure reason, or None if it is.

    Only emptiness is rejected. The codes come from several places — generation,
    the transcript service, and the pipeline's nodes later — so a closed list
    here would be a second place to update every time a new failure exists, and
    the one most likely to be forgotten. What cannot be allowed is a blank one:
    the screen maps a reason to its copy, and there is no copy for "".
    """
    if not code or not code.strip():
        return "A failed job needs a reason code."
    return None


def _utc_now_iso() -> str:
    """
    An explicit UTC timestamp for `completed_at`.

    Sent as a value rather than as SQL: PostgREST forwards a patch field as a
    literal, so a string like "now()" would reach Postgres as text to parse
    rather than as a function to call.
    """
    return datetime.now(timezone.utc).isoformat()


# --- Writes -------------------------------------------------------------------

def create_job(user_id: str, video_id: str, content_type: str) -> str:
    """
    Insert a `pending` job and return its id.

    Raises JobError("job-not-created") when the insert returns nothing, rather
    than handing back an id of None to fail somewhere less obvious later.
    """
    response = (
        get_supabase_client()
        .table(TABLE)
        .insert(
            {
                "user_id": user_id,
                "video_id": video_id,
                "content_type": content_type,
                **patch_for_status("pending"),
            }
        )
        .execute()
    )
    if not response.data:
        raise JobError("job-not-created", "The job record could not be created.")
    return str(response.data[0]["id"])


def advance(job_id: str, user_id: str, status: str) -> dict[str, Any]:
    """
    Move a job to `status` and return the updated row.

    `user_id` is required even though the caller usually created the job. It
    goes into the statement's predicate, so a job belonging to someone else is
    never matched — which keeps this safe no matter who calls it later.

    A terminal status is refused: finishing goes through `complete` or `fail`.
    See `advance_target_error` for why that matters rather than being tidiness.
    """
    if (reason := advance_target_error(status)) is not None:
        raise JobError("illegal-status", reason)
    return _update_unfinished(job_id, user_id, patch_for_status(status))


def complete(job_id: str, user_id: str, result_id: str) -> dict[str, Any]:
    """
    Mark a job completed and link the content it produced.

    The foreign key proves `result_id` names a real row. It does not prove the
    row belongs to this user, and nothing in the database will — the service key
    bypasses the policies that would. So it is checked here, before linking, or
    a job could be made to point at someone else's content.
    """
    _assert_content_belongs_to(result_id, user_id)

    patch = patch_for_status("completed")
    patch["result_id"] = result_id
    patch["completed_at"] = _utc_now_iso()
    return _update_unfinished(job_id, user_id, patch)


def fail(job_id: str, user_id: str, code: str, message: str) -> dict[str, Any]:
    """
    Mark a job failed, recording why.

    `code` is the stable reason the generating screen maps to its own copy;
    `message` is prose for a human and must not be parsed. Both are stored
    because neither can serve the other's purpose — which is also why an empty
    code is refused rather than stored.
    """
    if (reason := failure_code_error(code)) is not None:
        raise JobError("missing-failure-code", reason)

    patch = patch_for_status("failed")
    patch["error_code"] = code
    patch["error_message"] = message
    patch["completed_at"] = _utc_now_iso()
    return _update_unfinished(job_id, user_id, patch)


# --- Read ---------------------------------------------------------------------

def get_job(job_id: str, user_id: str) -> dict[str, Any]:
    """
    Return one job, scoped to its owner.

    Raises JobError("job-not-found") when there is no such job *or* it belongs
    to someone else. Deliberately one error: distinguishing them would confirm
    that a job id exists to somebody who does not own it.
    """
    response = (
        get_supabase_client()
        .table(TABLE)
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise JobError("job-not-found", "That job does not exist.")
    return dict(response.data[0])


# --- Internals ----------------------------------------------------------------

def _update_unfinished(
    job_id: str, user_id: str, patch: dict[str, Any]
) -> dict[str, Any]:
    """
    Apply `patch` to a job that is this user's and has not already finished.

    **Every condition is in the predicate, not checked after the fact.**
    Filtering on owner and on non-terminal status means a row failing either is
    never matched, so nothing is written to it. Reading the row count afterwards
    would report the mismatch only once the write had landed — too late to be a
    guard, and the difference between a refusal and a silent overwrite.

    An empty result means one of three things, none of which should have changed
    anything: no such job, not this user's, or already finished.
    """
    response = (
        get_supabase_client()
        .table(TABLE)
        .update(patch)
        .eq("id", job_id)
        .eq("user_id", user_id)
        .not_.in_("status", sorted(TERMINAL_STATUSES))
        .execute()
    )
    if not response.data:
        raise JobError(
            "job-not-updated",
            "That job does not exist, or has already finished.",
        )
    return dict(response.data[0])


def _assert_content_belongs_to(result_id: str, user_id: str) -> None:
    """
    Raise unless `result_id` names content owned by `user_id`.

    Scoped by owner in the query itself, so content belonging to someone else
    simply does not come back.
    """
    response = (
        get_supabase_client()
        .table(CONTENT_TABLE)
        .select("id")
        .eq("id", result_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise JobError(
            "result-not-owned",
            "That content does not exist, or does not belong to this user.",
        )
