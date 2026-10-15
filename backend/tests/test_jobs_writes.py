"""
Job writes: how `create_job` answers what the database says.

The Supabase client is replaced with a stand-in whose function call raises the
real `postgrest` APIError, so these check the mapping from database error to
job error — not the database itself. The admission function's SQL is pinned to
the rules in test_jobs_rules.py and checked against the live database when
migration 010 is applied.
"""

from typing import Any

import pytest
from postgrest.exceptions import APIError

from app.services import jobs
from app.services.jobs import JobError, create_job


class FakeCall:
    def __init__(self, raises: Exception | None, data: Any) -> None:
        self.raises = raises
        self.data = data
        self.function: str | None = None
        self.params: dict[str, Any] | None = None

    def rpc(self, function: str, params: dict[str, Any]) -> "FakeCall":
        self.function = function
        self.params = params
        return self

    def execute(self) -> Any:
        if self.raises:
            raise self.raises
        return type("Response", (), {"data": self.data})()


def use(monkeypatch: pytest.MonkeyPatch, raises: Exception | None = None,
        data: Any = None) -> FakeCall:
    call = FakeCall(raises, data if data is not None else [{"job_id": "job-1"}])
    monkeypatch.setattr(jobs, "get_supabase_client", lambda: call)
    return call


def api_error(code: str) -> APIError:
    return APIError({"code": code, "message": "from the database", "details": None, "hint": None})


def create(**changes: Any) -> str:
    args = {
        "user_id": "user-1",
        "video_id": "dQw4w9WgXcQ",
        "content_type": "summary",
        "request_id": "key-1",
        "platform": None,
        "limit": 2,
        **changes,
    }
    return create_job(**args)


def test_the_limit_is_reported_as_generation_limit(monkeypatch) -> None:
    use(monkeypatch, raises=api_error(jobs.GENERATION_LIMIT))
    with pytest.raises(JobError) as caught:
        create()
    assert caught.value.code == "generation-limit"


def test_a_unique_violation_is_reported_as_a_duplicate_request(monkeypatch) -> None:
    use(monkeypatch, raises=api_error("23505"))
    with pytest.raises(JobError) as caught:
        create()
    assert caught.value.code == "duplicate-request"


@pytest.mark.parametrize("code", ["23503", "42501", "PGRST301", "22023"])
def test_any_other_database_error_is_not_mistaken_for_a_known_refusal(monkeypatch, code) -> None:
    """A foreign-key, permission or bad-limit failure is neither 'already made' nor 'at the limit'."""
    use(monkeypatch, raises=api_error(code))
    with pytest.raises(APIError):
        create()


def test_the_job_is_made_by_the_admission_function(monkeypatch) -> None:
    call = use(monkeypatch)
    assert create() == "job-1"
    assert call.function == "admit_generation_job"
    assert call.params == {
        "p_user_id": "user-1",
        "p_video_id": "dQw4w9WgXcQ",
        "p_content_type": "summary",
        "p_request_id": "key-1",
        "p_platform": None,
        "p_limit": 2,
    }


def test_a_social_job_carries_its_platform(monkeypatch) -> None:
    """A repeated key is matched against it, so it must be written."""
    call = use(monkeypatch)
    create(content_type="social", platform="linkedin")
    assert call.params is not None
    assert call.params["p_platform"] == "linkedin"


def test_the_limit_it_is_given_is_the_one_it_sends(monkeypatch) -> None:
    call = use(monkeypatch)
    create(limit=3)
    assert call.params is not None
    assert call.params["p_limit"] == 3


@pytest.mark.parametrize("data", [[], [{}], [{"job_id": None}], [{"job_id": ""}], ["job-1"]])
def test_a_call_that_returns_no_job_id_is_not_created(monkeypatch, data) -> None:
    use(monkeypatch, data=data)
    with pytest.raises(JobError) as caught:
        create()
    assert caught.value.code == "job-not-created"


# --- Claiming, entering a stage, and checking a job ---------------------------


class FakeTable:
    """Records a chained PostgREST call and answers it with `rows`."""

    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows
        self.calls: list[tuple[str, tuple[Any, ...]]] = []
        self.not_ = self

    def __getattr__(self, name: str) -> Any:
        def record(*args: Any) -> "FakeTable":
            self.calls.append((name, args))
            return self
        return record

    def execute(self) -> Any:
        return type("Response", (), {"data": self.rows})()


def use_table(monkeypatch: pytest.MonkeyPatch, rows: list[dict[str, Any]]) -> FakeTable:
    table = FakeTable(rows)
    monkeypatch.setattr(jobs, "get_supabase_client", lambda: table)
    return table


def test_claiming_records_when_the_first_stage_began(monkeypatch) -> None:
    table = use_table(monkeypatch, [{"id": "job-1"}])
    jobs.claim("job-1", "user-1")
    (patch,) = [args[0] for name, args in table.calls if name == "update"]
    assert patch["status"] == jobs.CLAIM_STATUS
    assert patch["stage_started_at"] == {jobs.CLAIM_STATUS: patch["heartbeat_at"]}


def test_entering_a_stage_matches_only_this_users_unfinished_job(monkeypatch) -> None:
    """The predicate is the run's check that it may go on."""
    table = use_table(monkeypatch, [{"id": "job-1"}])
    jobs.enter_stage("job-1", "user-1", "drafting", {"drafting": "t1"}, "transcript-1")
    assert ("eq", ("id", "job-1")) in table.calls
    assert ("eq", ("user_id", "user-1")) in table.calls
    assert ("in_", ("status", sorted(jobs.TERMINAL_STATUSES))) in table.calls


def test_entering_a_stage_of_a_finished_job_is_job_not_updated(monkeypatch) -> None:
    use_table(monkeypatch, [])
    with pytest.raises(JobError) as caught:
        jobs.enter_stage("job-1", "user-1", "drafting", {"drafting": "t1"}, None)
    assert caught.value.code == "job-not-updated"


@pytest.mark.parametrize(("rows", "expected"), [([{"id": "job-1"}], True), ([], False)])
def test_a_job_is_unfinished_only_while_this_users_unfinished_row_exists(monkeypatch, rows, expected) -> None:
    table = use_table(monkeypatch, rows)
    assert jobs.is_unfinished("job-1", "user-1") is expected
    assert ("eq", ("user_id", "user-1")) in table.calls
    assert ("in_", ("status", sorted(jobs.TERMINAL_STATUSES))) in table.calls

