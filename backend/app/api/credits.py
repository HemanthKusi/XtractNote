"""
XtractNote — Credits routes

  GET  /api/credits                 → the caller's balance, the monthly
                                      allowance, and the next refill
  GET  /api/credits/quote?videoId=  → what each format costs on that video

So the create page can say what a start costs, and what the user has, before
they start one, and the menu can show the balance against the allowance.

Both routes require a signed-in user, and the user is whoever the access token
belongs to — nothing in a request names one. `balance_for` runs with the
service key and reads any user it is given, so this route is what binds it to
the caller.

**A quote is per video, with every format's price.** The price needs the
length, and the length is a YouTube lookup; one per video, rather than one per
format, means changing format on the page asks nothing more. The prices come
from `price_for`, the function a start is charged by.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.dependencies import CurrentUser, get_current_user
from app.api.video_checks import VIDEO_ID_PATTERN, length_refusal
from app.config import settings
from app.services.credits import balance_for
from app.services.pricing import BASE_PRICE, price_for
from app.services.prompts import ContentType
from app.services.video_length import LengthError, video_length

logger = logging.getLogger(__name__)

router = APIRouter()


class BalanceResponse(BaseModel):
    balance: int
    #: What each refill resets the balance to.
    allowance: int
    #: ISO 8601 with its offset.
    nextRefillAt: str


class QuoteResponse(BaseModel):
    videoId: str
    lengthSeconds: int
    prices: dict[ContentType, int]


# ── The caller's balance ─────────────────────────────────────
@router.get("", response_model=BalanceResponse)
def get_balance(user: CurrentUser = Depends(get_current_user)) -> BalanceResponse:
    """
    The caller's balance, after any refill that has come due, the allowance
    a refill resets it to, and when the next one comes. The first read for a
    user creates their account.

    A plain `def`: reading the balance is a blocking database call.
    """
    try:
        current = balance_for(user.id)
    except Exception:
        logger.exception("could not read a balance")
        raise HTTPException(
            status_code=503,
            detail={"code": "balance-unavailable", "message": "Your credits couldn't be checked just now."},
        )
    return BalanceResponse(
        balance=current.balance,
        # The setting balance_for refills from, so the two cannot disagree.
        allowance=settings.credits_per_month,
        nextRefillAt=current.next_refill_at.isoformat(),
    )


# ── What each format costs on a video ────────────────────────
@router.get("/quote", response_model=QuoteResponse)
def get_quote(
    videoId: str = Query(pattern=VIDEO_ID_PATTERN),
    # Unused beyond requiring sign-in: a quote spends a YouTube lookup.
    _user: CurrentUser = Depends(get_current_user),
) -> QuoteResponse:
    """
    Every format's price on `videoId`, from its length as YouTube reports it.

    A length that cannot be known is refused as a start would refuse it.

    A plain `def`: the length lookup is a blocking network call.
    """
    try:
        length_seconds = video_length(videoId)
    except LengthError as exc:
        raise length_refusal(exc)
    prices = {content_type: price_for(content_type, length_seconds) for content_type in BASE_PRICE}
    return QuoteResponse(videoId=videoId, lengthSeconds=length_seconds, prices=prices)
