"""
XtractNote — Rate limits at the routes

Every route that calls YouTube on a user's behalf takes one use of a bucket
first, so a refused call spends none of the project's quota. They refuse the
same way: a 429 `rate-limited` naming the wait, both as `Retry-After` and in
the body, where the browser can read it.

When the limit cannot be checked, the call is refused with a 503 rather than
let through: the limit protects a quota every user shares.
"""

import logging

from fastapi import HTTPException

from app.services.rate_limit import Bucket, RateLimited, consume

logger = logging.getLogger(__name__)

#: How long a caller refused because the limit could not be checked should
#: wait before asking again.
UNAVAILABLE_RETRY_AFTER_SECONDS = 30


def rate_limited(error: RateLimited) -> HTTPException:
    """The 429 for a user at a bucket's limit."""
    return HTTPException(
        status_code=429,
        detail={
            "code": "rate-limited",
            "message": "You've done this a lot in the last hour. Try again later.",
            "retryAfterSeconds": error.retry_after_seconds,
        },
        headers={"Retry-After": str(error.retry_after_seconds)},
    )


def take_use(user_id: str, bucket: Bucket) -> None:
    """
    Take one use of `bucket` for this user, or raise the refusal a route
    returns: a 429 at the limit, a 503 when the limit could not be checked.

    A plain function making a blocking database call: an `async` route must
    run it on a worker thread, or it holds up every other request.
    """
    try:
        consume(user_id, bucket)
    except RateLimited as exc:
        raise rate_limited(exc)
    except Exception:
        logger.exception("could not check the %s rate limit", bucket)
        raise HTTPException(
            status_code=503,
            detail={"code": "rate-limit-unavailable", "message": "That couldn't be checked just now. Try again in a moment."},
            headers={"Retry-After": str(UNAVAILABLE_RETRY_AFTER_SECONDS)},
        )
