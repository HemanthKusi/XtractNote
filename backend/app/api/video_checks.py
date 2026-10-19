"""
XtractNote — Checks on the video a request names

A start and a quote both name a video and both need its length, which only
YouTube can give. They accept the same ids and refuse an unknown length the
same way, so a quote never answers differently from the start it previews.
"""

from fastapi import HTTPException

from app.services.video_length import LengthError

VIDEO_ID_PATTERN = r"^[A-Za-z0-9_-]{11}$"

#: How long a caller refused with a 503 should wait before asking again.
LENGTH_RETRY_AFTER_SECONDS = 30

# The video itself is a 422; YouTube or this server's setup is a 503.
LENGTH_REFUSALS: dict[str, tuple[int, str]] = {
    "video-not-found": (422, "That video can't be found. It may be private or deleted."),
    "video-has-no-length": (422, "This video is live or hasn't premiered, so it has no length to price."),
    "length-unavailable": (503, "The video's length couldn't be checked just now. Try again in a moment."),
    "youtube-misconfigured": (503, "The video's length can't be checked right now."),
}


def length_refusal(error: LengthError) -> HTTPException:
    """The refusal for a length lookup that failed, with Retry-After on a 503."""
    status, message = LENGTH_REFUSALS.get(error.code, (503, "The video's length couldn't be checked."))
    headers = {"Retry-After": str(LENGTH_RETRY_AFTER_SECONDS)} if status == 503 else None
    return HTTPException(status_code=status, detail={"code": error.code, "message": message}, headers=headers)
