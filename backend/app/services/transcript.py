"""
Transcript service.

Domain logic for fetching and cleaning a YouTube video's captions.
This module is intentionally framework-free (no FastAPI): it takes a
video_id and returns a structured TranscriptData object, or raises one
of the typed errors below. The API/route layer is responsible for
turning those errors into HTTP responses.

Backed by `youtube-transcript-api` (v1.x instance API), which scrapes
YouTube's internal caption endpoint. No API key required.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    CouldNotRetrieveTranscript,
    InvalidVideoId,
    IpBlocked,
    NoTranscriptFound,
    NotTranslatable,
    RequestBlocked,
    TranslationLanguageNotAvailable,
    TranscriptsDisabled,
    VideoUnavailable,
)

# We prefer English. find_transcript() tries each code in order and, for a
# given language, prefers manually-created captions over auto-generated ones.
PREFERRED_LANGUAGES: tuple[str, ...] = ("en", "en-US", "en-GB")

_WHITESPACE_RE = re.compile(r"\s+")


# --------------------------------------------------------------------------- #
# Typed errors. Each carries a `code` that matches the frontend ERROR_MESSAGES
# keys, so the same string flows: service -> route -> client -> UI copy.
# --------------------------------------------------------------------------- #
class TranscriptServiceError(Exception):
    """Base class for all transcript failures we expect and handle."""

    code: str = "transcript-failed"

    def __init__(self, message: str, *, code: str | None = None) -> None:
        super().__init__(message)
        if code is not None:
            self.code = code


class TranscriptUnavailableError(TranscriptServiceError):
    """Captions are disabled, missing, or empty for this video."""

    code = "no-captions"


class VideoNotFoundError(TranscriptServiceError):
    """The video id is invalid, private, or no longer available."""

    code = "video-not-found"


class TranscriptBlockedError(TranscriptServiceError):
    """YouTube blocked the request (usually a datacenter IP in production)."""

    code = "transcript-blocked"


# --------------------------------------------------------------------------- #
# Output shapes. Plain dataclasses so the service stays framework-agnostic;
# the route layer converts these into a Pydantic response model.
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class TranscriptSegment:
    """A single caption line with its position in the video (seconds)."""

    text: str
    start: float
    duration: float


@dataclass(frozen=True)
class TranscriptData:
    """Everything downstream code needs from a transcript."""

    video_id: str
    language: str          # human-readable, e.g. "English"
    language_code: str     # e.g. "en"
    is_generated: bool     # True = auto-captions, False = human-written
    segment_count: int
    full_text: str         # cleaned, joined transcript ready for the AI
    segments: list[TranscriptSegment]


# --------------------------------------------------------------------------- #
# Public entry point
# --------------------------------------------------------------------------- #
def fetch_transcript(
    video_id: str,
    *,
    preferred_languages: Iterable[str] = PREFERRED_LANGUAGES,
) -> TranscriptData:
    """
    Fetch and clean the transcript for a YouTube video.

    Raises:
        TranscriptUnavailableError: no usable captions exist.
        VideoNotFoundError: bad/private/unavailable video.
        TranscriptBlockedError: YouTube blocked the request.
        TranscriptServiceError: any other unexpected retrieval failure.
    """
    languages = list(preferred_languages)
    api = YouTubeTranscriptApi()

    # Step 1: list the available transcript tracks for this video.
    try:
        transcript_list = api.list(video_id)
    except TranscriptsDisabled as exc:
        raise TranscriptUnavailableError(
            "Captions are turned off for this video."
        ) from exc
    except (VideoUnavailable, InvalidVideoId) as exc:
        raise VideoNotFoundError(
            "This video could not be found or is no longer available."
        ) from exc
    except (IpBlocked, RequestBlocked) as exc:
        raise TranscriptBlockedError(
            "YouTube is temporarily blocking transcript requests from the server."
        ) from exc
    except CouldNotRetrieveTranscript as exc:  # catch-all base, keep last
        raise TranscriptServiceError(
            f"Could not retrieve the transcript list: {exc}"
        ) from exc

    # Step 2: pick the best track (English preferred; translate as a fallback).
    transcript = _select_transcript(transcript_list, languages)

    # Step 3: fetch the chosen track's actual snippets.
    try:
        fetched = transcript.fetch()
    except (IpBlocked, RequestBlocked) as exc:
        raise TranscriptBlockedError(
            "YouTube is temporarily blocking transcript requests from the server."
        ) from exc
    except CouldNotRetrieveTranscript as exc:
        raise TranscriptServiceError(
            f"Could not fetch the transcript: {exc}"
        ) from exc

    # Step 4: normalize into our clean output shape.
    return _build_transcript_data(video_id, fetched)


# --------------------------------------------------------------------------- #
# Internal helpers
# --------------------------------------------------------------------------- #
def _select_transcript(transcript_list, languages: list[str]):
    """
    Choose a transcript track.

    Order of preference:
      1. English (manual preferred, then auto-generated) via find_transcript.
      2. If no English: take the first available track, and auto-translate it
         to English when the track supports translation.
    """
    try:
        return transcript_list.find_transcript(languages)
    except NoTranscriptFound:
        pass  # fall through to the non-English fallback below

    available = list(transcript_list)
    if not available:
        raise TranscriptUnavailableError("No transcript is available for this video.")

    transcript = available[0]
    target = languages[0] if languages else "en"
    if transcript.language_code not in languages and transcript.is_translatable:
        try:
            return transcript.translate(target)
        except (TranslationLanguageNotAvailable, NotTranslatable):
            pass  # keep the original-language track
    return transcript


def _build_transcript_data(video_id: str, fetched) -> TranscriptData:
    """Turn a FetchedTranscript into our cleaned TranscriptData."""
    segments: list[TranscriptSegment] = []
    for snippet in fetched.snippets:
        text = _normalize_whitespace(snippet.text)
        if not text:
            continue  # skip blank/whitespace-only caption lines
        segments.append(
            TranscriptSegment(
                text=text,
                start=round(float(snippet.start), 3),
                duration=round(float(snippet.duration), 3),
            )
        )

    full_text = _normalize_whitespace(" ".join(seg.text for seg in segments))
    if not full_text:
        raise TranscriptUnavailableError("The transcript for this video is empty.")

    return TranscriptData(
        video_id=video_id,
        language=fetched.language,
        language_code=fetched.language_code,
        is_generated=fetched.is_generated,
        segment_count=len(segments),
        full_text=full_text,
        segments=segments,
    )


def _normalize_whitespace(text: str) -> str:
    """Collapse newlines and repeated spaces into single spaces; trim ends."""
    return _WHITESPACE_RE.sub(" ", text).strip()
