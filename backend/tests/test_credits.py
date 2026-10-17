"""
Credits: reading a balance, and the rules migration 013 must keep.

The database client is replaced with a stand-in, so these check the call and
the checking of its answer — not the database. The refill itself runs in SQL;
its rules are pinned here by reading the migration, and its behaviour is
checked against the live database when the migration is applied.
"""

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pytest
from postgrest.exceptions import APIError

from app.config import settings
from app.services import credits
from app.services.credits import CreditBalance, CreditError, balance_for, balance_from

DATABASE = Path(__file__).resolve().parents[2] / "database"
MIGRATION = (DATABASE / "013_credits.sql").read_text()
ADMISSION = (DATABASE / "010_job_admission.sql").read_text()

ROW = {"balance": 30, "next_refill_at": "2026-11-16T20:01:54.123456+00:00"}


class FakeCall:
    def __init__(self, data: Any, raises: Exception | None = None) -> None:
        self.data = data
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
        return type("Response", (), {"data": self.data})()


def api_error(code: str) -> APIError:
    return APIError({"code": code, "message": "from the database", "details": None, "hint": None})


# --- Reading a balance --------------------------------------------------------


def test_the_balance_is_read_through_the_refilling_function(monkeypatch: pytest.MonkeyPatch) -> None:
    call = FakeCall([ROW])
    monkeypatch.setattr(credits, "get_supabase_client", lambda: call)
    assert balance_for("user-1") == CreditBalance(
        balance=30, next_refill_at=datetime(2026, 11, 16, 20, 1, 54, 123456, tzinfo=timezone.utc)
    )
    assert call.function == "credit_balance"
    assert call.params == {"p_user_id": "user-1", "p_allowance": settings.credits_per_month}


def test_a_user_with_no_sign_up_time_is_no_sign_up(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(credits, "get_supabase_client", lambda: FakeCall(None, api_error("P0002")))
    with pytest.raises(CreditError) as caught:
        balance_for("user-1")
    assert caught.value.code == "no-sign-up"


@pytest.mark.parametrize("code", ["42501", "22023", "PGRST301", "57014"])
def test_any_other_database_error_is_raised_as_it_came(monkeypatch: pytest.MonkeyPatch, code: str) -> None:
    """A permission or configuration fault must not pass for an ordinary refusal."""
    monkeypatch.setattr(credits, "get_supabase_client", lambda: FakeCall(None, api_error(code)))
    with pytest.raises(APIError) as caught:
        balance_for("user-1")
    assert caught.value.code == code


def test_the_allowance_is_thirty_by_default() -> None:
    assert type(settings).model_fields["credits_per_month"].default == 30


@pytest.mark.parametrize(
    "rows",
    [
        None,
        [],
        [ROW, ROW],
        ["not a row"],
        [{**ROW, "balance": -1}],
        [{**ROW, "balance": 2.5}],
        [{**ROW, "balance": "30"}],
        [{**ROW, "balance": True}],
        [{**ROW, "balance": None}],
        [{**ROW, "next_refill_at": None}],
        [{**ROW, "next_refill_at": "next month"}],
        [{**ROW, "next_refill_at": "2026-11-16T20:01:54"}],
    ],
)
def test_an_answer_out_of_shape_is_refused(rows: Any) -> None:
    with pytest.raises(CreditError) as caught:
        balance_from(rows)
    assert caught.value.code == "balance-unreadable"


def test_a_zero_balance_is_a_balance() -> None:
    assert balance_from([{**ROW, "balance": 0}]).balance == 0


# --- What the migration must keep ---------------------------------------------


def sql(text: str) -> str:
    """The migration's statements with comments and repeated spaces removed."""
    return re.sub(r"\s+", " ", re.sub(r"--[^\n]*", "", text))


STATEMENTS = sql(MIGRATION)


@pytest.mark.parametrize("table", ["credit_accounts", "credit_ledger"])
def test_users_can_neither_read_nor_write_the_credit_tables(table: str) -> None:
    assert f"alter table public.{table} enable row level security" in STATEMENTS
    assert f"revoke all on public.{table} from anon, authenticated" in STATEMENTS
    assert "create policy" not in STATEMENTS


@pytest.mark.parametrize(
    "function",
    [
        "credit_sign_up_time(uuid)",
        "credit_period(timestamptz, timestamptz)",
        "apply_credit_refill(uuid, int)",
        "credit_balance(uuid, int)",
    ],
)
def test_only_the_backend_can_call_the_credit_functions(function: str) -> None:
    assert f"revoke all on function public.{function} from public, anon, authenticated" in STATEMENTS
    assert f"grant execute on function public.{function} to service_role" in STATEMENTS


def test_only_the_sign_up_lookup_runs_with_its_owners_rights() -> None:
    """service_role cannot read auth.users live; one narrow function reads it, and nothing else does."""
    assert STATEMENTS.count("security definer") == 1
    definer = STATEMENTS[STATEMENTS.index("function public.credit_sign_up_time"):]
    definer = definer[: definer.index("$$;")]
    assert "security definer set search_path = ''" in definer
    assert "select created_at from auth.users where id = p_user_id;" in definer


def test_a_balance_can_never_go_below_zero() -> None:
    assert "balance int not null check (balance >= 0)" in STATEMENTS
    assert "balance_after int not null check (balance_after >= 0)" in STATEMENTS


def test_refill_dates_are_counted_from_the_sign_up_time_in_utc() -> None:
    """Counting on from a clamped date would lose the 31st for good."""
    assert "next_refill_at := p_anchor + make_interval(months => v_months + 1)" in STATEMENTS
    assert "next_refill_at + " not in STATEMENTS and "period_start + " not in STATEMENTS
    assert "set timezone = 'UTC'" in STATEMENTS
    assert "from public.credit_period(v_anchor, v_now)" in STATEMENTS


def test_the_sign_up_time_comes_from_auth_not_the_editable_profile() -> None:
    """Users may update their own profile row, so its created_at would let them pick their refill date."""
    assert "v_anchor := public.credit_sign_up_time(p_user_id);" in STATEMENTS
    assert "public.profiles" not in STATEMENTS


def test_a_refill_resets_the_balance_rather_than_adding_to_it() -> None:
    assert "set balance = p_allowance," in STATEMENTS
    assert "balance + " not in STATEMENTS


def test_reading_a_balance_takes_the_lock_admission_takes() -> None:
    lock = "pg_advisory_xact_lock( hashtextextended('generation_jobs:' || p_user_id::text, 0) )"
    assert lock in sql(ADMISSION)
    assert lock in STATEMENTS


def test_the_ledger_kinds_are_the_four_the_milestone_names() -> None:
    assert "check (kind in ('refill', 'reserve', 'keep', 'refund'))" in STATEMENTS
