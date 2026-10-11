"""
XtractNote — API Dependencies

Reusable dependencies that FastAPI injects into route handlers.

`get_current_user` verifies the Supabase access token on a request and hands the
route the user it belongs to, or refuses the request before the route runs.
"""

import logging
from dataclasses import dataclass

from fastapi import Header, HTTPException
from gotrue.errors import AuthError, AuthRetryableError

from app.db.supabase import get_supabase_client

logger = logging.getLogger(__name__)

_BEARER = "Bearer "


@dataclass(frozen=True)
class CurrentUser:
    """The user a request was verified as. Routes depend on this, not on Supabase's type."""

    id: str


def _refuse(status: int, code: str, message: str) -> HTTPException:
    """A refusal in the same `{code, message}` shape every other error uses."""
    headers = {"WWW-Authenticate": "Bearer"} if status == 401 else None
    return HTTPException(
        status_code=status, detail={"code": code, "message": message}, headers=headers
    )


def get_current_user(
    authorization: str | None = Header(
        default=None, description="Bearer <supabase_access_token>"
    ),
) -> CurrentUser:
    """
    Verify the request's access token with Supabase and return its user.

    Usage in a route:

        @router.post("")
        def create(user: CurrentUser = Depends(get_current_user)) -> ...:
            ...  # user.id is verified

    **A plain `def`, not `async def`.** The Supabase call is blocking network
    I/O; FastAPI runs a plain dependency on a worker thread, where an `async`
    one would hold up every other request for the length of the round trip.

    **The header is optional in the signature** so that a missing one reaches
    this function and is answered `401`, rather than being rejected by FastAPI
    as a malformed request.

    Refusals carry a `code` and never the underlying error's text:
      - `401 not-authenticated` — no token, or Supabase rejected it
      - `503 auth-unavailable`  — Supabase could not be reached; signing in
                                  again would not help, so it is not a 401
    """
    if not authorization or not authorization.startswith(_BEARER):
        raise _refuse(401, "not-authenticated", "Sign in to continue.")

    token = authorization[len(_BEARER):].strip()
    # Never pass an empty token on. Given none, `get_user` falls back to the
    # client's own stored session rather than refusing.
    if not token:
        raise _refuse(401, "not-authenticated", "Sign in to continue.")

    try:
        response = get_supabase_client().auth.get_user(token)
    except AuthRetryableError:
        logger.warning("auth check could not reach Supabase", exc_info=True)
        raise _refuse(503, "auth-unavailable", "Sign-in could not be checked. Try again shortly.")
    except AuthError:
        raise _refuse(401, "not-authenticated", "Your session has expired. Sign in again.")
    except Exception:
        logger.exception("auth check failed unexpectedly")
        raise _refuse(503, "auth-unavailable", "Sign-in could not be checked. Try again shortly.")

    if not response or not response.user or not response.user.id:
        raise _refuse(401, "not-authenticated", "Sign in to continue.")

    return CurrentUser(id=str(response.user.id))
