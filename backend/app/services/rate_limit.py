"""
XtractNote — Per-user rate limits

`consume` records one use of a bucket for a user through `consume_rate_limit`
(migration 015), or refuses it when the user has used that bucket's hourly
limit. The database counts and records in one step under a lock per user and
bucket, so the limit holds across processes.

`retry_after_from` reads the database's refusal and is pure; `consume` makes
the call.
"""

import json
from typing import Any, Literal

from postgrest.exceptions import APIError

from app.config import settings
from app.db.supabase import get_supabase_client

RATE_LIMIT_FUNCTION = "consume_rate_limit"

# The SQLSTATE consume_rate_limit raises when the user is at the limit.
RATE_LIMITED = "XN429"

#: The window each limit is counted over: a use counts until it is this old.
WINDOW_SECONDS = 3600

Bucket = Literal["youtube-search", "youtube-metadata", "video-length"]


class RateLimited(Exception):
    """The user is at this bucket's limit. Nothing was recorded."""

    def __init__(self, bucket: Bucket, retry_after_seconds: int) -> None:
        self.bucket = bucket
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Rate limited on {bucket}; retry in {retry_after_seconds}s.")


def limit_for(bucket: Bucket) -> int:
    """The hourly limit for `bucket`, from settings."""
    limits: dict[Bucket, int] = {
        "youtube-search": settings.youtube_search_per_hour,
        "youtube-metadata": settings.youtube_metadata_per_hour,
        "video-length": settings.video_length_lookups_per_hour,
    }
    return limits[bucket]


def retry_after_from(details: Any) -> int | None:
    """
    The wait in the refusal's detail — JSON with a whole `retry_after_seconds`
    from 1 to the window — or None when the detail cannot be read.
    """
    try:
        data = json.loads(details) if isinstance(details, str) else None
    except ValueError:
        return None
    seconds = data.get("retry_after_seconds") if isinstance(data, dict) else None
    if isinstance(seconds, bool) or not isinstance(seconds, int):
        return None
    return seconds if 1 <= seconds <= WINDOW_SECONDS else None


def consume(user_id: str, bucket: Bucket) -> None:
    """
    Record one use of `bucket` for this user.

    Raises RateLimited when the user is at the bucket's limit, with the wait
    the database gave, or the whole window when its detail cannot be read —
    a wait after which a use is sure to have aged out. Any other database
    error is raised as it came, as in `jobs.create_job`.
    """
    try:
        get_supabase_client().rpc(
            RATE_LIMIT_FUNCTION,
            {
                "p_user_id": user_id,
                "p_bucket": bucket,
                "p_limit": limit_for(bucket),
                "p_window_seconds": WINDOW_SECONDS,
            },
        ).execute()
    except APIError as exc:
        if exc.code == RATE_LIMITED:
            raise RateLimited(bucket, retry_after_from(exc.details) or WINDOW_SECONDS) from exc
        raise
