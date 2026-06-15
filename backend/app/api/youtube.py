"""
backend/app/api/youtube.py

The YouTube metadata endpoint: POST /api/youtube/metadata

Flow:
  1. Receive a videoId from the frontend (already extracted there).
  2. RE-VALIDATE it server-side (never trust the client).
  3. Call the YouTube Data API v3 with our secret key.
  4. Reshape the response into our VideoMeta contract and return it.

The route prefix "/api/youtube" is added in main.py via include_router,
so here we only declare the path relative to that ("/metadata").
"""

import re

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter()

# ── Constants ────────────────────────────────────────────────
# A YouTube video ID is exactly 11 chars from this set.
_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")

# YouTube Data API "videos.list" endpoint.
_YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/videos"

# Thumbnail sizes the API may return, best first.
_THUMB_PRIORITY = ["maxres", "standard", "high", "medium", "default"]

# ISO 8601 duration like "PT1H2M10S" (YouTube's format). T is optional so
# odd cases like "P0D" (some live streams) parse to 0 instead of crashing.
_DURATION_RE = re.compile(
    r"P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?"
)


# ── Request / Response shapes ────────────────────────────────
class MetadataRequest(BaseModel):
    # camelCase to match what the frontend sends ({ "videoId": "..." }).
    videoId: str


class VideoMeta(BaseModel):
    # Field names are camelCase on purpose so the JSON matches the
    # frontend's VideoMeta type exactly — one contract, no translation.
    videoId: str
    title: str
    channel: str
    channelUrl: str | None = None
    thumbnailUrl: str
    url: str
    durationSeconds: int | None = None


# ── Helpers ──────────────────────────────────────────────────
def _parse_iso8601_duration(value: str | None) -> int | None:
    """Convert 'PT1H24M8S' -> total seconds. Returns None if unparseable."""
    if not value:
        return None
    match = _DURATION_RE.fullmatch(value)
    if not match:
        return None
    days, hours, minutes, seconds = (int(g) if g else 0 for g in match.groups())
    return days * 86400 + hours * 3600 + minutes * 60 + seconds


def _best_thumbnail(thumbnails: dict, video_id: str) -> str:
    """Pick the highest-resolution thumbnail the API returned."""
    for key in _THUMB_PRIORITY:
        item = thumbnails.get(key)
        if item and item.get("url"):
            return item["url"]
    # Fallback: YouTube's CDN always has hqdefault for a valid ID.
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"


# ── Endpoint ─────────────────────────────────────────────────
@router.post("/metadata", response_model=VideoMeta)
async def get_metadata(req: MetadataRequest) -> VideoMeta:
    video_id = req.videoId.strip()

    # 1. Re-validate. The frontend already checked, but anyone can call
    #    this endpoint directly, so we never assume the input is clean.
    if not _VIDEO_ID_RE.match(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID.")

    # 2. We need the secret key. If it's missing, that's a server
    #    misconfiguration (500), not the user's fault.
    api_key = settings.youtube_api_key
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Server is missing YOUTUBE_API_KEY.",
        )

    # 3. Call the YouTube Data API.
    params = {
        "part": "snippet,contentDetails",
        "id": video_id,
        "key": api_key,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(_YOUTUBE_API_URL, params=params)
    except httpx.RequestError:
        # Network problem reaching Google.
        raise HTTPException(status_code=502, detail="Could not reach YouTube.")

    if response.status_code != 200:
        # Bad key, quota exceeded, API disabled, etc. 502 = upstream failed.
        raise HTTPException(
            status_code=502,
            detail="YouTube API request failed.",
        )

    data = response.json()
    items = data.get("items", [])
    if not items:
        # No item = video doesn't exist, is private, or is region-blocked.
        raise HTTPException(
            status_code=404,
            detail="Video not found, private, or unavailable.",
        )

    item = items[0]
    snippet = item.get("snippet", {})
    content_details = item.get("contentDetails", {})

    channel_id = snippet.get("channelId")
    channel_url = (
        f"https://www.youtube.com/channel/{channel_id}" if channel_id else None
    )

    # 4. Reshape into our contract and return.
    return VideoMeta(
        videoId=video_id,
        title=snippet.get("title", "Untitled video"),
        channel=snippet.get("channelTitle", "Unknown channel"),
        channelUrl=channel_url,
        thumbnailUrl=_best_thumbnail(snippet.get("thumbnails", {}), video_id),
        url=f"https://www.youtube.com/watch?v={video_id}",
        durationSeconds=_parse_iso8601_duration(content_details.get("duration")),
    )