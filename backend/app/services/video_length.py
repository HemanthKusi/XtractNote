"""
XtractNote — A video's length, from YouTube

The length a generation is priced by, asked of the YouTube Data API rather
than taken from the request: one `videos.list` call for `contentDetails`,
which costs one unit of the API's daily quota.

`length_from` reads the API's answer and is pure; `video_length` makes the
call. Every way the length cannot be known has its own code, so a refusal
can say whether trying again might help.
"""

import json
from typing import Any

import httpx

from app.config import settings
from app.utils.youtube import YOUTUBE_VIDEOS_URL, parse_iso8601_duration

#: How long the call may wait on YouTube, per phase of the request.
LOOKUP_TIMEOUT_SECONDS = 10.0


class LengthError(Exception):
    """
    The length could not be known. `code` is one of:
      - "video-not-found"       : no such video, or private or blocked
      - "video-has-no-length"   : live or upcoming; YouTube reports no length
      - "length-unavailable"    : YouTube unreachable, refused, or answered
                                  in a shape this module does not read
      - "youtube-misconfigured" : the server has no YouTube API key
    """

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


def _unavailable(message: str) -> LengthError:
    return LengthError("length-unavailable", message)


def length_from(status_code: int, body: bytes) -> int:
    """The video's length in whole seconds, from a `videos.list` answer."""
    if status_code != 200:
        raise _unavailable(f"YouTube answered with status {status_code}.")
    try:
        data: Any = json.loads(body)
    except ValueError:
        raise _unavailable("YouTube's answer was not JSON.")
    items = data.get("items") if isinstance(data, dict) else None
    if not isinstance(items, list):
        raise _unavailable("YouTube's answer had no list of videos.")
    if not items:
        raise LengthError("video-not-found", "The video does not exist, or is private or blocked.")
    details = items[0].get("contentDetails") if isinstance(items[0], dict) else None
    raw = details.get("duration") if isinstance(details, dict) else None
    if raw is None:
        raise LengthError("video-has-no-length", "YouTube reports no length for this video.")
    seconds = parse_iso8601_duration(raw) if isinstance(raw, str) else None
    if seconds is None:
        raise _unavailable(f"YouTube reported a length this module does not read: {raw!r}.")
    if seconds == 0:
        raise LengthError("video-has-no-length", "YouTube reports no length for this video.")
    return seconds


def video_length(video_id: str, *, client: httpx.Client | None = None) -> int:
    """
    The length of `video_id` in whole seconds, asked of YouTube.

    `client` is for tests; the default is a fresh client with this module's
    timeout. Raises LengthError, with the codes listed on it.
    """
    api_key = settings.youtube_api_key
    if not api_key:
        raise LengthError("youtube-misconfigured", "The server has no YouTube API key.")
    params = {"part": "contentDetails", "id": video_id, "key": api_key}
    try:
        if client is not None:
            response = client.get(YOUTUBE_VIDEOS_URL, params=params)
        else:
            with httpx.Client(timeout=LOOKUP_TIMEOUT_SECONDS) as own:
                response = own.get(YOUTUBE_VIDEOS_URL, params=params)
    except httpx.HTTPError:
        # Raised `from None`: httpx's error carries the request URL, and the
        # URL carries the API key, so it must not travel on in a traceback.
        raise _unavailable("YouTube could not be reached.") from None
    return length_from(response.status_code, response.content)
