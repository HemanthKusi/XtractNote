"""
backend/app/services/search.py

Topic-search domain logic for XtractNote.

Framework-free (no FastAPI): given a query and an API key, it returns a list
of SearchResultVideo objects, or raises one of the typed errors below. The
api/route layer turns those errors into HTTP responses — same split as
transcript.py.

Uses the YouTube Data API v3 in two calls, because search.list alone does not
return duration or view count:

  1. search.list  -> relevance-ordered video IDs + snippet (title, channel,
                     thumbnail, description, publishedAt).
  2. videos.list  -> contentDetails.duration + statistics.viewCount for those
                     IDs, merged back in while preserving search.list's order.

Quota note: search.list costs 100 units/call regardless of maxResults;
videos.list costs ~1. So fetching 30 costs the same as fetching 10.
"""

from __future__ import annotations

import html
from dataclasses import dataclass

import httpx

from app.utils.youtube import (
    YOUTUBE_VIDEOS_URL,
    best_thumbnail,
    parse_iso8601_duration,
)

# YouTube Data API v3 "search.list" endpoint.
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

# YouTube allows 0–50 results per search.list call.
_MAX_ALLOWED_RESULTS = 50

# Error "reason" strings YouTube returns when the daily quota / rate limit is
# hit. We surface these distinctly so the UI can say "try again tomorrow"
# rather than a generic failure.
_QUOTA_REASONS = frozenset(
    {
        "quotaExceeded",
        "dailyLimitExceeded",
        "rateLimitExceeded",
        "userRateLimitExceeded",
    }
)


# --------------------------------------------------------------------------- #
# Typed errors. Each carries a `code` that flows service -> route -> client
# -> UI copy, exactly like transcript.py's error classes.
# --------------------------------------------------------------------------- #
class SearchServiceError(Exception):
    """Base class for all search failures we expect and handle."""

    code: str = "search-failed"

    def __init__(self, message: str, *, code: str | None = None) -> None:
        super().__init__(message)
        if code is not None:
            self.code = code


class SearchQuotaError(SearchServiceError):
    """The daily YouTube API quota (or a rate limit) was exceeded."""

    code = "quota-exceeded"


# --------------------------------------------------------------------------- #
# Output shape. A plain dataclass so the service stays framework-agnostic; the
# route layer converts these into a Pydantic response model. All fields are
# RAW — formatting ("1.4M views", "2 months ago") is the frontend's job.
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class SearchResultVideo:
    video_id: str
    title: str
    channel: str
    channel_url: str | None
    thumbnail_url: str
    url: str
    description: str
    published_at: str | None       # raw ISO 8601 from snippet.publishedAt
    duration_seconds: int | None   # None if enrichment failed / unavailable
    view_count: int | None         # None if hidden / enrichment failed


# --------------------------------------------------------------------------- #
# Public entry point
# --------------------------------------------------------------------------- #
async def search_videos(
    query: str,
    api_key: str,
    *,
    max_results: int = 30,
) -> list[SearchResultVideo]:
    """
    Search YouTube for videos matching `query`.

    Returns a relevance-ordered list (possibly empty — an empty list means the
    search succeeded with zero matches, which is NOT an error).

    Raises:
        SearchQuotaError:   daily quota / rate limit exceeded.
        SearchServiceError: any other upstream failure (bad key, network, 5xx).
    """
    query = query.strip()
    max_results = max(1, min(max_results, _MAX_ALLOWED_RESULTS))

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Call 1: relevance-ordered IDs + snippet. This is the expensive one.
        partials = await _search(client, query, api_key, max_results)
        if not partials:
            return []  # zero matches — the route returns 200 + [] (see notes)

        # Call 2: best-effort enrichment. If this fails we still return the
        # results, just without duration/views — losing enrichment shouldn't
        # kill the whole search.
        ids = [p["video_id"] for p in partials]
        stats = await _enrich(client, ids, api_key)

    # Merge, preserving search.list's relevance order (NOT videos.list's order,
    # which YouTube does not guarantee — that's why we key by ID).
    results: list[SearchResultVideo] = []
    for p in partials:
        duration, views = stats.get(p["video_id"], (None, None))
        results.append(
            SearchResultVideo(
                video_id=p["video_id"],
                title=p["title"],
                channel=p["channel"],
                channel_url=p["channel_url"],
                thumbnail_url=p["thumbnail_url"],
                url=p["url"],
                description=p["description"],
                published_at=p["published_at"],
                duration_seconds=duration,
                view_count=views,
            )
        )
    return results


# --------------------------------------------------------------------------- #
# Internal helpers
# --------------------------------------------------------------------------- #
async def _search(
    client: httpx.AsyncClient,
    query: str,
    api_key: str,
    max_results: int,
) -> list[dict]:
    """Run search.list and return parsed snippet dicts, in relevance order."""
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",          # videos only — no channels/playlists
        "maxResults": max_results,
        "key": api_key,
    }
    try:
        response = await client.get(YOUTUBE_SEARCH_URL, params=params)
    except httpx.RequestError as exc:
        raise SearchServiceError("Could not reach YouTube.") from exc

    if response.status_code != 200:
        raise _classify_error(response)

    items = response.json().get("items", [])
    parsed: list[dict] = []
    for item in items:
        row = _parse_search_item(item)
        if row is not None:
            parsed.append(row)
    return parsed


async def _enrich(
    client: httpx.AsyncClient,
    video_ids: list[str],
    api_key: str,
) -> dict[str, tuple[int | None, int | None]]:
    """
    Best-effort: fetch duration + view count for the given IDs via videos.list.

    Returns { video_id: (duration_seconds, view_count) }. On ANY failure returns
    an empty dict so the caller degrades gracefully rather than erroring.
    """
    if not video_ids:
        return {}

    params = {
        "part": "contentDetails,statistics",
        "id": ",".join(video_ids),
        "key": api_key,
    }
    try:
        response = await client.get(YOUTUBE_VIDEOS_URL, params=params)
    except httpx.RequestError:
        return {}
    if response.status_code != 200:
        return {}

    lookup: dict[str, tuple[int | None, int | None]] = {}
    for item in response.json().get("items", []):
        video_id = item.get("id")
        if not video_id:
            continue
        duration = parse_iso8601_duration(
            item.get("contentDetails", {}).get("duration")
        )
        views = _safe_int(item.get("statistics", {}).get("viewCount"))
        lookup[video_id] = (duration, views)
    return lookup


def _parse_search_item(item: dict) -> dict | None:
    """Turn one search.list item into a snippet dict, or None if unusable."""
    video_id = item.get("id", {}).get("videoId")
    if not video_id:
        return None  # not a video result (shouldn't happen with type=video)

    snippet = item.get("snippet", {})
    channel_id = snippet.get("channelId")

    return {
        "video_id": video_id,
        # YouTube returns titles/descriptions HTML-escaped ("&amp;", "&#39;").
        # Unescape so the UI shows real characters, not entity codes.
        "title": html.unescape(snippet.get("title", "") or "Untitled video"),
        "channel": html.unescape(
            snippet.get("channelTitle", "") or "Unknown channel"
        ),
        "channel_url": (
            f"https://www.youtube.com/channel/{channel_id}" if channel_id else None
        ),
        "thumbnail_url": best_thumbnail(snippet.get("thumbnails", {}), video_id),
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "description": html.unescape(snippet.get("description", "") or ""),
        "published_at": snippet.get("publishedAt"),
    }


def _classify_error(response: httpx.Response) -> SearchServiceError:
    """Map a non-200 YouTube response to the right typed error."""
    reason = None
    try:
        errors = response.json().get("error", {}).get("errors", [])
        if errors:
            reason = errors[0].get("reason")
    except Exception:
        pass  # non-JSON body — fall through to the generic failure

    if reason in _QUOTA_REASONS:
        return SearchQuotaError(
            "YouTube search quota exceeded. Please try again later."
        )
    return SearchServiceError("YouTube search request failed.")


def _safe_int(value) -> int | None:
    """Parse a string like '1420000' to int, or None if missing/invalid."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return None