"""
backend/app/api/youtube.py

YouTube endpoints:
  - POST /api/youtube/metadata    -> video title, channel, thumbnail, duration
  - POST /api/youtube/transcript  -> cleaned transcript text + language info
  - POST /api/youtube/search      -> relevance-ordered topic-search results

The route prefix "/api/youtube" is added in main.py via include_router,
so here we only declare paths relative to that ("/metadata", etc.).

Parsing helpers (duration, thumbnail) and the videos.list URL now live in
app/utils/youtube.py, shared with the search service to avoid a circular
import (this module imports the search service to wire its route).
"""

import re

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.config import settings
from app.services.search import SearchServiceError, search_videos
from app.services.transcript import TranscriptServiceError, fetch_transcript
from app.utils.youtube import (
    YOUTUBE_VIDEOS_URL,
    best_thumbnail,
    parse_iso8601_duration,
)

router = APIRouter()

# ── Constants ────────────────────────────────────────────────
# A YouTube video ID is exactly 11 chars from this set. Used for request
# validation (not parsing), so it stays local to the api layer.
_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


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


class TranscriptRequest(BaseModel):
    # Same camelCase contract as the metadata request.
    videoId: str


class TranscriptResponse(BaseModel):
    # camelCase to mirror the frontend's Transcript type exactly.
    # Note: we deliberately do NOT ship the per-line `segments` array yet.
    # fullText is what the AI step needs; segments (with timestamps) are
    # computed server-side and can be exposed later for timestamp features.
    videoId: str
    language: str          # human-readable, e.g. "English"
    languageCode: str      # e.g. "en"
    isGenerated: bool       # True = auto-captions, False = human-written
    segmentCount: int
    fullText: str


class SearchRequest(BaseModel):
    # The raw topic string the user typed. maxResults is here so the fetch
    # size is a contract knob we can raise later (e.g. 30 -> 100) without
    # touching the service; the service clamps it to YouTube's 1..50 range.
    query: str
    maxResults: int = 30


class SearchResultItem(BaseModel):
    # camelCase mirror of the service's SearchResultVideo dataclass. All
    # fields RAW — the frontend formats views ("1.4M"), dates, duration.
    videoId: str
    title: str
    channel: str
    channelUrl: str | None = None
    thumbnailUrl: str
    url: str
    description: str
    publishedAt: str | None = None
    durationSeconds: int | None = None
    viewCount: int | None = None


class SearchResponse(BaseModel):
    # An envelope (not a bare array) so we can add nextPageToken /
    # totalResults later for server-side paging without breaking the
    # frontend contract. For now the frontend just reads `.results`.
    results: list[SearchResultItem]


# ── Error-code -> HTTP status maps ───────────────────────────
# The codes come from the service layer and flow straight through to the
# frontend's ERROR_MESSAGES map as structured `detail`.
_TRANSCRIPT_ERROR_STATUS = {
    "no-captions": 422,        # video is fine, but there's no usable transcript
    "video-not-found": 404,    # bad / private / removed video
    "transcript-blocked": 502, # YouTube blocked our server's request
    "transcript-failed": 502,  # any other upstream retrieval failure
}

_SEARCH_ERROR_STATUS = {
    "quota-exceeded": 429,     # daily YouTube quota / rate limit hit
    "search-failed": 502,      # bad key, upstream 5xx, unreadable body, network
}


# ── Metadata endpoint ────────────────────────────────────────
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

    # 3. Call the YouTube Data API (videos.list).
    params = {
        "part": "snippet,contentDetails",
        "id": video_id,
        "key": api_key,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(YOUTUBE_VIDEOS_URL, params=params)
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
        thumbnailUrl=best_thumbnail(snippet.get("thumbnails", {}), video_id),
        url=f"https://www.youtube.com/watch?v={video_id}",
        durationSeconds=parse_iso8601_duration(content_details.get("duration")),
    )


# ── Transcript endpoint ──────────────────────────────────────
@router.post("/transcript", response_model=TranscriptResponse)
async def get_transcript(req: TranscriptRequest) -> TranscriptResponse:
    video_id = req.videoId.strip()

    # 1. Re-validate the ID, same as metadata — never trust the client.
    if not _VIDEO_ID_RE.match(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID.")

    # 2. fetch_transcript() is BLOCKING (the library uses `requests` under
    #    the hood). Calling it directly inside an async route would freeze
    #    the whole event loop while it waits on the network. run_in_threadpool
    #    runs it on a worker thread so the server stays responsive.
    try:
        data = await run_in_threadpool(fetch_transcript, video_id)
    except TranscriptServiceError as exc:
        # 3. The service raised a known, typed error. Translate its `code`
        #    into an HTTP status and pass the code through to the frontend
        #    as structured detail so the UI can pick the right message.
        status = _TRANSCRIPT_ERROR_STATUS.get(exc.code, 502)
        raise HTTPException(
            status_code=status,
            detail={"code": exc.code, "message": str(exc)},
        )

    # 4. Success. Reshape the dataclass into our camelCase contract.
    return TranscriptResponse(
        videoId=data.video_id,
        language=data.language,
        languageCode=data.language_code,
        isGenerated=data.is_generated,
        segmentCount=data.segment_count,
        fullText=data.full_text,
    )


# ── Search endpoint ──────────────────────────────────────────
@router.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest) -> SearchResponse:
    query = req.query.strip()

    # 1. A blank query never reaches a paid API call. The frontend only
    #    routes non-URL, non-empty text here, but we don't trust the client.
    if not query:
        raise HTTPException(status_code=400, detail="Search query is required.")

    # 2. Same missing-key guard as metadata — a server misconfig, not the
    #    user's fault.
    api_key = settings.youtube_api_key
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Server is missing YOUTUBE_API_KEY.",
        )

    # 3. Run the search service. It's already async (httpx), so we await it
    #    directly — no threadpool needed (unlike the blocking transcript lib).
    try:
        results = await search_videos(query, api_key, max_results=req.maxResults)
    except SearchServiceError as exc:
        # Same pattern as transcript: map the typed .code to an HTTP status
        # and pass structured detail through so the UI can message it.
        status = _SEARCH_ERROR_STATUS.get(exc.code, 502)
        raise HTTPException(
            status_code=status,
            detail={"code": exc.code, "message": str(exc)},
        )

    # 4. Reshape each snake_case dataclass into the camelCase response model.
    #    An empty `results` list is a valid success — the frontend shows its
    #    "No videos matched…" empty state, no error involved.
    return SearchResponse(
        results=[
            SearchResultItem(
                videoId=r.video_id,
                title=r.title,
                channel=r.channel,
                channelUrl=r.channel_url,
                thumbnailUrl=r.thumbnail_url,
                url=r.url,
                description=r.description,
                publishedAt=r.published_at,
                durationSeconds=r.duration_seconds,
                viewCount=r.view_count,
            )
            for r in results
        ]
    )