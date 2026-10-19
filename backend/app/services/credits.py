"""
XtractNote — Credits

A user's credit balance, read through `credit_balance` (migration 013), which
applies any due monthly refill before answering. The balance and its ledger
are written only by database functions; this module calls them and checks
what comes back.
"""

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from postgrest.exceptions import APIError

from app.config import settings
from app.db.supabase import get_supabase_client

BALANCE_FUNCTION = "credit_balance"

# The SQLSTATE credit_balance raises for a user with no record to count credit
# periods from (no_data_found).
NO_SIGN_UP = "P0002"


class CreditError(Exception):
    """A credit operation that failed. `code` is a stable string, as in JobError."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


@dataclass(frozen=True)
class CreditBalance:
    balance: int
    next_refill_at: datetime


@dataclass(frozen=True)
class CreditShortfall:
    """Why a start was refused for credits: its price, the balance, and when more arrive."""

    cost: int
    balance: int
    next_refill_at: datetime


def _zoned_time(value: Any) -> datetime | None:
    """`value` as a timezone-aware datetime, or None."""
    try:
        parsed = datetime.fromisoformat(value) if isinstance(value, str) else None
    except ValueError:
        return None
    return parsed if parsed is not None and parsed.tzinfo is not None else None


def _count(value: Any, minimum: int) -> int | None:
    """`value` as a whole number of credits at least `minimum`, or None."""
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        return None
    return value


def shortfall_from(details: Any) -> CreditShortfall | None:
    """
    The shortfall in admission's XN402 detail — JSON with cost, balance and
    next_refill_at — or None when the detail cannot be read.
    """
    try:
        data = json.loads(details) if isinstance(details, str) else None
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    cost = _count(data.get("cost"), 1)
    balance = _count(data.get("balance"), 0)
    refill = _zoned_time(data.get("next_refill_at"))
    if cost is None or balance is None or refill is None:
        return None
    return CreditShortfall(cost=cost, balance=balance, next_refill_at=refill)


def balance_from(rows: Any) -> CreditBalance:
    """
    The balance in `credit_balance`'s answer: one row with a whole, non-negative
    balance and a timezone-aware refill time.

    Raises CreditError("balance-unreadable") for anything else, rather than
    showing a user a number the database did not give.
    """
    if not isinstance(rows, list) or len(rows) != 1 or not isinstance(rows[0], dict):
        raise CreditError("balance-unreadable", "The balance came back in an unexpected shape.")
    row = rows[0]
    balance = _count(row.get("balance"), 0)
    if balance is None:
        raise CreditError("balance-unreadable", "The balance is not a whole number of credits.")
    next_refill_at = _zoned_time(row.get("next_refill_at"))
    if next_refill_at is None:
        raise CreditError("balance-unreadable", "The next refill time is not a timestamp with a zone.")
    return CreditBalance(balance=balance, next_refill_at=next_refill_at)


def balance_for(user_id: str) -> CreditBalance:
    """
    This user's balance, after any refill that has come due.

    The first call for a user creates their account with the full allowance.

    Raises CreditError("no-sign-up") for a user the database has no sign-up
    time for. Any other database error is raised as it came, as in
    `jobs.create_job`, so a permission or configuration fault is not taken
    for an ordinary refusal.
    """
    try:
        response = (
            get_supabase_client()
            .rpc(BALANCE_FUNCTION, {"p_user_id": user_id, "p_allowance": settings.credits_per_month})
            .execute()
        )
    except APIError as exc:
        if exc.code == NO_SIGN_UP:
            raise CreditError("no-sign-up", "There is no sign-up time to count this user's credits from.") from exc
        raise
    return balance_from(response.data)
