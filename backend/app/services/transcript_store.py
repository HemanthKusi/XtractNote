"""
XtractNote — Stored transcripts

The `transcripts` table (migration 011): one row per fetch, never changed,
shared across users. A generation reuses the newest row for its video while it
is recent enough, and fetches and stores a new one otherwise.

**Two layers, as in `jobs.py`.** What a row holds, whether it may be reused and
what text it yields are pure functions; the reads and writes are a thin shell.

**The segments are what is stored.** The text a generation reads is rebuilt
from them with `join_segment_texts`, the function a fetch uses to build it.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from app.db.supabase import get_supabase_client
from app.services.drafts import count_words
from app.services.generate import MAX_TRANSCRIPT_CHARS
from app.services.transcript import (
    TranscriptData,
    TranscriptSegment,
    TranscriptServiceError,
    fetch_transcript,
    join_segment_texts,
)

TABLE = "transcripts"

#: The columns a generation needs back. `segments` can be large, so the job
#: status reads `word_count` alone and never this list.
_COLUMNS = "id, segments, word_count"


@dataclass(frozen=True)
class StoredTranscript:
    """A transcript row, as a generation reads it."""

    id: str
    full_text: str
    word_count: int
    # The caption lines with their times, which sectioning works from.
    segments: tuple[TranscriptSegment, ...] = ()


# --- Pure rules ---------------------------------------------------------------

def reuse_cutoff(now: datetime, reuse_for: timedelta) -> str:
    """The ISO timestamp a row must be fetched after to be reused."""
    return (now - reuse_for).isoformat()


def row_for(data: TranscriptData) -> dict[str, Any]:
    """The `transcripts` row for one fetch."""
    return {
        "video_id": data.video_id,
        "language": data.language,
        "language_code": data.language_code,
        "is_generated": data.is_generated,
        "segments": [
            {"text": seg.text, "start": seg.start, "duration": seg.duration}
            for seg in data.segments
        ],
        "word_count": count_words(data.full_text),
    }


def segments_from(stored: Any) -> tuple[TranscriptSegment, ...]:
    """
    Stored segments, checked, as the caption lines they were.

    Raises TranscriptServiceError("transcript-failed") when the stored value is
    not a list of segments with text and times, rather than generating from a
    partial or garbled transcript.
    """
    if not isinstance(stored, list):
        raise TranscriptServiceError("A stored transcript is not a list of segments.")
    segments: list[TranscriptSegment] = []
    for segment in stored:
        text = segment.get("text") if isinstance(segment, dict) else None
        if not isinstance(text, str):
            raise TranscriptServiceError("A stored transcript segment has no text.")
        start, duration = segment.get("start"), segment.get("duration")
        if not _is_time(start) or not _is_time(duration):
            raise TranscriptServiceError("A stored transcript segment has no time.")
        segments.append(TranscriptSegment(text=text, start=float(start), duration=float(duration)))
    return tuple(segments)


def _is_time(value: Any) -> bool:
    """A number of seconds: an int or a float, not a bool, not negative."""
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0


def text_from_segments(segments: Any) -> str:
    """The text a generation reads, rebuilt from stored segments."""
    return join_segment_texts(segment.text for segment in segments_from(segments))


def stored_from_row(row: dict[str, Any]) -> StoredTranscript:
    """A row from the table, checked, as a generation reads it."""
    transcript_id = row.get("id")
    word_count = row.get("word_count")
    if not isinstance(transcript_id, str) or not transcript_id:
        raise TranscriptServiceError("A stored transcript has no id.")
    if not isinstance(word_count, int) or isinstance(word_count, bool):
        raise TranscriptServiceError("A stored transcript has no word count.")
    segments = segments_from(row.get("segments"))
    return StoredTranscript(
        id=transcript_id,
        full_text=join_segment_texts(segment.text for segment in segments),
        word_count=word_count,
        segments=segments,
    )


# --- Reads and writes ---------------------------------------------------------

def find_reusable(video_id: str, reuse_for: timedelta, now: datetime) -> StoredTranscript | None:
    """The newest row for `video_id` fetched within `reuse_for`, or None."""
    response = (
        get_supabase_client()
        .table(TABLE)
        .select(_COLUMNS)
        .eq("video_id", video_id)
        .gte("fetched_at", reuse_cutoff(now, reuse_for))
        .order("fetched_at", desc=True)
        .limit(1)
        .execute()
    )
    return stored_from_row(dict(response.data[0])) if response.data else None


def insert(data: TranscriptData) -> StoredTranscript:
    """Store one fetch and return it as a generation reads it."""
    response = get_supabase_client().table(TABLE).insert(row_for(data)).execute()
    if not response.data:
        raise TranscriptServiceError("The transcript could not be stored.")
    return stored_from_row(dict(response.data[0]))


def obtain(
    video_id: str,
    reuse_for: timedelta,
    *,
    fetch: Callable[[str], TranscriptData] = fetch_transcript,
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
) -> StoredTranscript:
    """
    The transcript a generation for `video_id` reads: a recent stored row if
    there is one, otherwise a fresh fetch, stored.

    Raises the fetch's TranscriptServiceError subclasses unchanged, so their
    codes reach the job. A transcript too long to generate from is refused
    with "transcript-too-long" before it is stored, so a run that cannot use
    it leaves nothing behind.
    """
    found = find_reusable(video_id, reuse_for, now())
    if found is not None:
        return found
    data = fetch(video_id)
    if len(data.full_text) > MAX_TRANSCRIPT_CHARS:
        raise TranscriptServiceError(
            "This video's transcript is too long to process in one pass.",
            code="transcript-too-long",
        )
    return insert(data)
