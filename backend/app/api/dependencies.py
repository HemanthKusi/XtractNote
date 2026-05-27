"""
XtractNote — API Dependencies

Reusable dependencies that FastAPI injects into route handlers.
The most important one is get_current_user() which verifies
the Supabase auth token before any protected route runs.
"""

from fastapi import Depends, HTTPException, Header
from app.db.supabase import get_supabase_client


async def get_current_user(
    authorization: str = Header(..., description="Bearer <supabase_access_token>")
) -> dict:
    """
    Layer 3: Auth verification.

    Extracts the JWT token from the Authorization header,
    verifies it with Supabase, and returns the user object.

    If the token is invalid or missing, raises 401 Unauthorized
    and the route handler never executes.

    Usage in routes:
        @router.get("/api/content")
        async def list_content(user: dict = Depends(get_current_user)):
            # 'user' is guaranteed to be authenticated here
            user_id = user.id
    """
    # Check header format
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header. Expected: Bearer <token>",
        )

    # Extract token
    token = authorization[7:]  # Remove "Bearer " prefix

    try:
        # Verify the token with Supabase
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        return user_response.user

    except HTTPException:
        raise  # Re-raise our own HTTP exceptions
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}",
        )
