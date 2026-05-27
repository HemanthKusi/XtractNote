"""
XtractNote — YouTube API Routes

Handles video URL validation, metadata fetching, and transcript extraction.
These are the entry points for the generation flow.
"""

from fastapi import APIRouter

router = APIRouter()


@router.post("/validate")
async def validate_youtube_url():
    """Validate a YouTube URL and extract the video ID."""
    return {"message": "YouTube validate endpoint — coming in Phase 6"}


@router.post("/metadata")
async def get_video_metadata():
    """Fetch video title, channel, duration, and thumbnail."""
    return {"message": "YouTube metadata endpoint — coming in Phase 6"}


@router.post("/transcript")
async def get_video_transcript():
    """Extract the video transcript/captions."""
    return {"message": "YouTube transcript endpoint — coming in Phase 6"}
