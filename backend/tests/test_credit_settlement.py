"""
What migration 014 must keep: a price reserved at admission, and one
settlement per job on its first move to a finished status.

These read the migration's statements; its behaviour is checked against a
throwaway PostgreSQL and the live database when it is applied.
"""

import re
from pathlib import Path

DATABASE = Path(__file__).resolve().parents[2] / "database"


def sql(text: str) -> str:
    """The statements with comments and repeated spaces removed."""
    return re.sub(r"\s+", " ", re.sub(r"--[^\n]*", "", text))


MIGRATION = sql((DATABASE / "014_credits_reserve_settle.sql").read_text())
LOCK = "pg_advisory_xact_lock( hashtextextended('generation_jobs:' || "

ADMIT = MIGRATION[MIGRATION.index("create or replace function public.admit_generation_job"):]
ADMIT = ADMIT[: ADMIT.index("$$;")]
SETTLE = MIGRATION[MIGRATION.index("create or replace function public.settle_job_credits"):]
SETTLE = SETTLE[: SETTLE.index("$$;")]
REFILL = MIGRATION[MIGRATION.index("create or replace function public.apply_credit_refill"):]
REFILL = REFILL[: REFILL.index("$$;")]


def test_a_job_can_no_longer_be_admitted_without_a_price() -> None:
    assert "drop function if exists public.admit_generation_job(uuid, text, text, uuid, text, int);" in MIGRATION
    assert "p_cost int, p_allowance int" in ADMIT
    assert "if p_cost is null or p_cost < 1 then" in ADMIT


def test_nothing_is_charged_before_the_duplicate_and_limit_checks() -> None:
    order = [
        ADMIT.index(LOCK),
        ADMIT.index("errcode = '23505'"),
        ADMIT.index("errcode = 'XN429'"),
        ADMIT.index("public.apply_credit_refill(p_user_id, p_allowance)"),
        ADMIT.index("errcode = 'XN402'"),
        ADMIT.index("insert into public.generation_jobs"),
        ADMIT.index("set balance = balance - p_cost"),
        ADMIT.index("'reserve', -p_cost"),
    ]
    assert order == sorted(order)


def test_a_short_balance_is_refused_with_its_numbers() -> None:
    assert "if v_account.balance < p_cost then" in ADMIT
    assert "'cost', p_cost, 'balance', v_account.balance, 'next_refill_at', v_account.next_refill_at" in ADMIT


def test_settling_fires_once_on_the_first_move_to_a_finished_status() -> None:
    assert (
        "create trigger trg_generation_jobs_settle after update of status on public.generation_jobs "
        "for each row when (old.status not in ('completed', 'failed') and new.status in ('completed', 'failed')) "
        "execute function public.settle_job_credits();"
    ) in MIGRATION


def test_one_reserve_and_one_settlement_per_job_is_enforced_by_the_database() -> None:
    assert "on public.credit_ledger (job_id) where kind = 'reserve';" in MIGRATION
    assert "on public.credit_ledger (job_id) where kind in ('keep', 'refund');" in MIGRATION


def test_completing_keeps_and_failing_refunds_unless_the_period_turned() -> None:
    assert "if new.status = 'completed' then v_kind := 'keep'; v_amount := 0;" in SETTLE
    assert "elsif v_reserve.period_start < v_current then v_kind := 'refund'; v_amount := 0;" in SETTLE
    assert "else v_kind := 'refund'; v_amount := -v_reserve.amount;" in SETTLE


def test_a_job_with_nothing_reserved_settles_nothing() -> None:
    assert "where job_id = new.id and kind = 'reserve'; if not found then" in SETTLE


def test_admission_balance_reads_and_settling_share_one_lock() -> None:
    assert LOCK + "p_user_id::text, 0) )" in ADMIT
    assert LOCK + "new.user_id::text, 0) )" in SETTLE


def test_the_refill_reads_the_actual_time_not_the_transaction_start() -> None:
    assert "v_now timestamptz := clock_timestamp();" in REFILL
    assert "now()" not in REFILL


def test_users_cannot_admit_or_settle() -> None:
    signature = "public.admit_generation_job(uuid, text, text, uuid, text, int, int, int)"
    assert f"revoke all on function {signature} from public, anon, authenticated;" in MIGRATION
    assert f"grant execute on function {signature} to service_role;" in MIGRATION
    assert "revoke all on function public.settle_job_credits() from public, anon, authenticated;" in MIGRATION
    assert "security definer" not in MIGRATION
