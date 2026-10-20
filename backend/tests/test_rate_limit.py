"""
Rate limits: the call to the database, the reading of its refusal, and the
rules migration 015 must keep.

The database client is replaced with a stand-in, so these check the call and
the reading of its answer — not the database. The counting runs in SQL; its
rules are pinned here by reading the migration, and its behaviour is checked
against a database when the migration is applied.
"""

import re
from pathlib import Path
from typing import Any

import pytest
from postgrest.exceptions import APIError

from app.config import settings
from app.services import rate_limit
from app.services.rate_limit import WINDOW_SECONDS, RateLimited, consume, limit_for, retry_after_from

MIGRATION = (Path(__file__).resolve().parents[2] / "database" / "015_rate_limits.sql").read_text()

# What the migration says outside its comments.
SQL = "\n".join(line.split("--", 1)[0] for line in MIGRATION.splitlines())


class FakeCall:
    def __init__(self, raises: Exception | None = None) -> None:
        self.raises = raises
        self.function: str | None = None
        self.params: dict[str, Any] | None = None

    def rpc(self, function: str, params: dict[str, Any]) -> "FakeCall":
        self.function = function
        self.params = params
        return self

    def execute(self) -> Any:
        if self.raises:
            raise self.raises
        return type("Response", (), {"data": [{"remaining": 19}]})()


def api_error(code: str, details: Any = None) -> APIError:
    return APIError({"code": code, "message": "from the database", "details": details, "hint": None})


# --- Reading the refusal ------------------------------------------------------


@pytest.mark.parametrize(
    ("details", "seconds"),
    [
        ('{"retry_after_seconds" : 1187}', 1187),  # Postgres's json_build_object spacing
        ('{"retry_after_seconds": 1}', 1),
        (f'{{"retry_after_seconds": {WINDOW_SECONDS}}}', WINDOW_SECONDS),
    ],
)
def test_the_wait_is_read_from_the_refusal(details: str, seconds: int) -> None:
    assert retry_after_from(details) == seconds


@pytest.mark.parametrize(
    "details",
    [
        None,
        "",
        "not json",
        "[1187]",
        '{"retry_after_seconds": 0}',
        f'{{"retry_after_seconds": {WINDOW_SECONDS + 1}}}',
        '{"retry_after_seconds": -5}',
        '{"retry_after_seconds": 12.5}',
        '{"retry_after_seconds": "60"}',
        '{"retry_after_seconds": true}',
        '{"wait": 60}',
    ],
)
def test_a_wait_that_cannot_be_read_is_none(details: Any) -> None:
    assert retry_after_from(details) is None


# --- The call -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("bucket", "setting"),
    [
        ("youtube-search", "youtube_search_per_hour"),
        ("youtube-metadata", "youtube_metadata_per_hour"),
        ("video-length", "video_length_lookups_per_hour"),
    ],
)
def test_each_bucket_is_limited_by_its_own_setting(
    monkeypatch: pytest.MonkeyPatch, bucket: rate_limit.Bucket, setting: str
) -> None:
    monkeypatch.setattr(settings, setting, 7)
    call = FakeCall()
    monkeypatch.setattr(rate_limit, "get_supabase_client", lambda: call)
    consume("user-1", bucket)
    assert limit_for(bucket) == 7
    assert call.function == "consume_rate_limit"
    assert call.params == {"p_user_id": "user-1", "p_bucket": bucket, "p_limit": 7, "p_window_seconds": 3600}


def test_the_limits_default_to_the_decided_numbers() -> None:
    assert (settings.youtube_search_per_hour, settings.youtube_metadata_per_hour) == (20, 120)
    assert settings.video_length_lookups_per_hour == 30


def test_a_refusal_carries_the_wait_the_database_gave(monkeypatch: pytest.MonkeyPatch) -> None:
    refused = api_error("XN429", '{"retry_after_seconds" : 1187}')
    monkeypatch.setattr(rate_limit, "get_supabase_client", lambda: FakeCall(refused))
    with pytest.raises(RateLimited) as caught:
        consume("user-1", "youtube-search")
    assert (caught.value.bucket, caught.value.retry_after_seconds) == ("youtube-search", 1187)


def test_a_refusal_whose_wait_cannot_be_read_waits_the_whole_window(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rate_limit, "get_supabase_client", lambda: FakeCall(api_error("XN429", "garbled")))
    with pytest.raises(RateLimited) as caught:
        consume("user-1", "video-length")
    assert caught.value.retry_after_seconds == WINDOW_SECONDS


@pytest.mark.parametrize("code", ["42501", "22023", "23514", "PGRST202", "57014"])
def test_any_other_database_error_is_raised_as_it_came(monkeypatch: pytest.MonkeyPatch, code: str) -> None:
    """A missing function or a permission fault must not pass for a user at their limit."""
    monkeypatch.setattr(rate_limit, "get_supabase_client", lambda: FakeCall(api_error(code)))
    with pytest.raises(APIError) as caught:
        consume("user-1", "youtube-search")
    assert caught.value.code == code


# --- What migration 015 must keep ---------------------------------------------


def test_the_buckets_the_table_accepts_are_the_buckets_the_backend_sends() -> None:
    allowed = re.search(r"bucket\s+text not null check \(bucket in \(([^)]*)\)\)", SQL)
    assert allowed is not None
    assert sorted(re.findall(r"'([^']+)'", allowed.group(1))) == sorted(rate_limit.Bucket.__args__)


def test_users_can_neither_read_nor_write_the_uses() -> None:
    assert "alter table public.rate_limit_events enable row level security;" in SQL
    assert "revoke all on public.rate_limit_events from anon, authenticated;" in SQL
    assert "create policy" not in SQL


def test_only_the_backend_may_call_the_function() -> None:
    signature = "public.consume_rate_limit(uuid, text, int, int)"
    assert f"revoke all on function {signature}\n  from public, anon, authenticated;" in SQL
    assert f"grant execute on function {signature}\n  to service_role;" in SQL
    assert "security definer" not in SQL


def test_the_refusal_code_is_the_one_the_backend_reads() -> None:
    assert f"errcode = '{rate_limit.RATE_LIMITED}'" in SQL
    assert "json_build_object('retry_after_seconds', v_retry)" in SQL


def test_the_count_is_taken_under_a_lock_per_user_and_bucket() -> None:
    lock = SQL.index("pg_advisory_xact_lock")
    assert "p_user_id::text || ':' || coalesce(p_bucket, '')" in SQL[lock:]
    assert lock < SQL.index("select count(*) into v_used")
