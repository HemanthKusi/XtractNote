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
