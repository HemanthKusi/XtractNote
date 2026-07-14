"""
backend/app/utils/youtube.py

Small, framework-free helpers for parsing YouTube Data API v3 responses.

These were originally defined as private functions inside api/youtube.py
during Phase 5. They moved here in Phase 10 so the new search service can
reuse them WITHOUT importing from the api layer: api/youtube.py imports the
search service to wire its route, so a reverse import (service -> api) would
be circular. A neutral utils module that both the api layer and the service
layer import breaks that cycle — and pure parsing helpers belong in utils
anyway, not in a route file.

No FastAPI, no httpx, no config here — just string/dict parsing.
"""

import re

# YouTube Data API v3 "videos.list" endpoint. Used by the metadata endpoint
# and by the search service's enrichment call (to fetch duration + views).
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

# Thumbnail sizes the API may return, best first.
_THUMB_PRIORITY = ["maxres", "standard", "high", "medium", "default"]

# ISO 8601 duration like "PT1H2M10S" (YouTube's format). The T group is
# optional so odd cases like "P0D" (some live streams) parse to 0 instead
# of crashing.
_DURATION_RE = re.compile(
    r"P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?"
)


def parse_iso8601_duration(value: str | None) -> int | None:
    """Convert 'PT1H24M8S' -> total seconds. Returns None if unparseable."""
    if not value:
        return None
    match = _DURATION_RE.fullmatch(value)
    if not match:
        return None
    days, hours, minutes, seconds = (int(g) if g else 0 for g in match.groups())
    return days * 86400 + hours * 3600 + minutes * 60 + seconds


def best_thumbnail(thumbnails: dict, video_id: str) -> str:
    """Pick the highest-resolution thumbnail the API returned."""
    for key in _THUMB_PRIORITY:
        item = thumbnails.get(key)
        if item and item.get("url"):
            return item["url"]
    # Fallback: YouTube's CDN always has hqdefault for a valid ID.
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"