"""
Job writes: how `create_job` answers what the database says.

The Supabase client is replaced with a stand-in whose insert raises the real
`postgrest` APIError, so these check the mapping from database error to job
error — not the database itself, which was checked when migration 008 was
applied.
"""

from typing import Any

import pytest
from postgrest.exceptions import APIError

from app.services import jobs
from app.services.jobs import JobError, create_job


class FakeInsert:
    def __init__(self, raises: Exception | None, data: list[dict[str, Any]]) -> None:
        self.raises = raises
        self.data = data
        self.row: dict[str, Any] | None = None

    def insert(self, row: dict[str, Any]) -> "FakeInsert":
        self.row = row
        return self

    def execute(self) -> Any:
        if self.raises:
            raise self.raises
        return type("Response", (), {"data": self.data})()


def use(monkeypatch: pytest.MonkeyPatch, raises: Exception | None = None,
        data: list[dict[str, Any]] | None = None) -> FakeInsert:
    insert = FakeInsert(raises, data if data is not None else [{"id": "job-1"}])
    client = type("Client", (), {"table": lambda self, name: insert})()
    monkeypatch.setattr(jobs, "get_supabase_client", lambda: client)
    return insert


def api_error(code: str) -> APIError:
    return APIError({"code": code, "message": "from the database", "details": None, "hint": None})


def test_a_unique_violation_is_reported_as_a_duplicate_request(monkeypatch) -> None:
    use(monkeypatch, raises=api_error("23505"))
    with pytest.raises(JobError) as caught:
        create_job("user-1", "dQw4w9WgXcQ", "summary", "key-1")
    assert caught.value.code == "duplicate-request"


@pytest.mark.parametrize("code", ["23503", "42501", "PGRST301"])
def test_any_other_database_error_is_not_mistaken_for_a_duplicate(monkeypatch, code) -> None:
    """A foreign-key or permission failure must not be answered as 'already made'."""
    use(monkeypatch, raises=api_error(code))
    with pytest.raises(APIError):
        create_job("user-1", "dQw4w9WgXcQ", "summary", "key-1")


def test_the_row_carries_the_request_key_and_starts_pending(monkeypatch) -> None:
    insert = use(monkeypatch)
    assert create_job("user-1", "dQw4w9WgXcQ", "summary", "key-1") == "job-1"
    assert insert.row is not None
    assert insert.row["request_id"] == "key-1"
    assert insert.row["user_id"] == "user-1"
    assert insert.row["status"] == "pending"


def test_an_insert_that_returns_nothing_is_not_created(monkeypatch) -> None:
    use(monkeypatch, data=[])
    with pytest.raises(JobError) as caught:
        create_job("user-1", "dQw4w9WgXcQ", "summary", "key-1")
    assert caught.value.code == "job-not-created"
