"""
Stored transcripts: the rules, the reuse decision, and the migration they match.

The table is replaced with a stand-in, so these check what is read, written and
reused — not Postgres. Migration 011's SQL is pinned to the row the backend
writes, and the live run checks the rest.
"""

import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from app.services import transcript_store
from app.services.drafts import count_words
from app.services.generate import MAX_TRANSCRIPT_CHARS
from app.services.transcript import (
    TranscriptServiceError,
    TranscriptUnavailableError,
    _build_transcript_data,
)
from app.services.transcript_store import (
    StoredTranscript,
    obtain,
    reuse_cutoff,
    row_for,
    stored_from_row,
    text_from_segments,
)

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=timezone.utc)
MONTH = timedelta(days=30)


def fetched(*lines: tuple[str, float, float]) -> Any:
    """What the captions library hands back, as far as the service reads it."""
    return SimpleNamespace(
        snippets=[SimpleNamespace(text=text, start=start, duration=duration) for text, start, duration in lines],
        language="English",
        language_code="en",
        is_generated=True,
    )


DATA = _build_transcript_data(
    "dQw4w9WgXcQ",
    fetched(
        ("  The tide  rises\n", 0.0, 2.5),
        ("   ", 2.5, 1.0),
        ("because of\tthe moon.", 3.5, 2.123456),
    ),
)


# --- The row ------------------------------------------------------------------


def test_the_row_keeps_every_segment_with_its_timestamps() -> None:
    row = row_for(DATA)
    assert row["segments"] == [
        {"text": "The tide rises", "start": 0.0, "duration": 2.5},
        {"text": "because of the moon.", "start": 3.5, "duration": 2.123},
    ]


def test_the_row_carries_the_language_and_caption_kind() -> None:
    row = row_for(DATA)
    assert (row["video_id"], row["language"], row["language_code"], row["is_generated"]) == (
        "dQw4w9WgXcQ", "English", "en", True,
    )


def test_the_row_stores_no_text_beside_the_segments() -> None:
    """The text is derived from the segments; storing it too would double the row."""
    assert "full_text" not in row_for(DATA)


def test_the_word_count_is_the_browsers_count_of_the_text() -> None:
    assert row_for(DATA)["word_count"] == count_words(DATA.full_text) == 7


def test_text_rebuilt_from_stored_segments_is_the_text_a_fetch_produces() -> None:
    """The guarantee the whole design rests on: storing loses nothing a generation reads."""
    assert text_from_segments(row_for(DATA)["segments"]) == DATA.full_text


# --- Reading a stored row -----------------------------------------------------


def stored_row(**changes: Any) -> dict[str, Any]:
    return {"id": "transcript-1", "segments": row_for(DATA)["segments"], "word_count": 7, **changes}


def test_a_stored_row_reads_back_as_the_text_and_count() -> None:
    assert stored_from_row(stored_row()) == StoredTranscript(
        id="transcript-1", full_text=DATA.full_text, word_count=7
    )


@pytest.mark.parametrize(
    "segments",
    [None, "The tide rises", {"text": "x"}, [{"start": 0.0}], [{"text": 5}], ["The tide"]],
)
def test_segments_that_are_not_segments_are_refused(segments: Any) -> None:
    with pytest.raises(TranscriptServiceError):
        stored_from_row(stored_row(segments=segments))


@pytest.mark.parametrize(
    "changes", [{"id": None}, {"id": ""}, {"word_count": None}, {"word_count": "7"}, {"word_count": True}]
)
def test_a_row_without_an_id_or_count_is_refused(changes: dict[str, Any]) -> None:
    with pytest.raises(TranscriptServiceError):
        stored_from_row(stored_row(**changes))


def test_a_refused_row_is_reported_as_transcript_failed() -> None:
    with pytest.raises(TranscriptServiceError) as caught:
        stored_from_row(stored_row(segments=None))
    assert caught.value.code == "transcript-failed"


# --- Reuse --------------------------------------------------------------------


def test_the_cutoff_is_the_window_before_now() -> None:
    assert reuse_cutoff(NOW, MONTH) == "2026-09-12T12:00:00+00:00"


class FakeQuery:
    """Records the reuse query and answers it."""

    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows
        self.calls: list[tuple[str, tuple[Any, ...]]] = []

    def __getattr__(self, name: str) -> Any:
        def record(*args: Any, **kwargs: Any) -> "FakeQuery":
            self.calls.append((name, args + tuple(sorted(kwargs.items()))))
            return self
        return record

    def execute(self) -> Any:
        return SimpleNamespace(data=self.rows)


def use_table(monkeypatch: pytest.MonkeyPatch, rows: list[dict[str, Any]]) -> FakeQuery:
    query = FakeQuery(rows)
    monkeypatch.setattr(transcript_store, "get_supabase_client", lambda: query)
    return query


def test_the_reuse_query_asks_for_the_newest_row_inside_the_window(monkeypatch) -> None:
    query = use_table(monkeypatch, [stored_row()])
    found = transcript_store.find_reusable("dQw4w9WgXcQ", MONTH, NOW)
    assert found is not None and found.id == "transcript-1"
    assert ("table", ("transcripts",)) in query.calls
    assert ("eq", ("video_id", "dQw4w9WgXcQ")) in query.calls
    assert ("gte", ("fetched_at", reuse_cutoff(NOW, MONTH))) in query.calls
    assert ("order", ("fetched_at", ("desc", True))) in query.calls
    assert ("limit", (1,)) in query.calls


def test_the_reuse_query_never_reads_the_text_column_it_does_not_have(monkeypatch) -> None:
    query = use_table(monkeypatch, [])
    transcript_store.find_reusable("dQw4w9WgXcQ", MONTH, NOW)
    (columns,) = [args[0] for name, args in query.calls if name == "select"]
    assert {column.strip() for column in columns.split(",")} == {"id", "segments", "word_count"}


def test_no_recent_row_is_none(monkeypatch) -> None:
    use_table(monkeypatch, [])
    assert transcript_store.find_reusable("dQw4w9WgXcQ", MONTH, NOW) is None


def test_an_insert_that_returns_nothing_is_refused(monkeypatch) -> None:
    use_table(monkeypatch, [])
    with pytest.raises(TranscriptServiceError):
        transcript_store.insert(DATA)


class Effects:
    """Stand-ins for the store's reads and writes, and for the fetch."""

    def __init__(self, monkeypatch: pytest.MonkeyPatch, found: StoredTranscript | None) -> None:
        self.found = found
        self.fetched: list[str] = []
        self.inserted: list[Any] = []
        self.reuse_asked: list[tuple[str, timedelta, datetime]] = []
        monkeypatch.setattr(transcript_store, "find_reusable", self.find_reusable)
        monkeypatch.setattr(transcript_store, "insert", self.insert)

    def find_reusable(self, video_id: str, reuse_for: timedelta, now: datetime) -> StoredTranscript | None:
        self.reuse_asked.append((video_id, reuse_for, now))
        return self.found

    def insert(self, data: Any) -> StoredTranscript:
        self.inserted.append(data)
        return StoredTranscript(id="new", full_text=data.full_text, word_count=7)

    def fetch(self, video_id: str) -> Any:
        self.fetched.append(video_id)
        return DATA


REUSABLE = StoredTranscript(id="kept", full_text=DATA.full_text, word_count=7)


def test_a_recent_row_is_reused_and_nothing_is_fetched(monkeypatch) -> None:
    effects = Effects(monkeypatch, found=REUSABLE)
    assert obtain("dQw4w9WgXcQ", MONTH, fetch=effects.fetch, now=lambda: NOW) is REUSABLE
    assert effects.fetched == [] and effects.inserted == []
    assert effects.reuse_asked == [("dQw4w9WgXcQ", MONTH, NOW)]


def test_without_a_recent_row_the_video_is_fetched_and_stored(monkeypatch) -> None:
    effects = Effects(monkeypatch, found=None)
    stored = obtain("dQw4w9WgXcQ", MONTH, fetch=effects.fetch, now=lambda: NOW)
    assert effects.fetched == ["dQw4w9WgXcQ"]
    assert effects.inserted == [DATA]
    assert stored.id == "new"


def sized(characters: int) -> Any:
    """A fetched transcript whose text is exactly `characters` long."""
    return _build_transcript_data("dQw4w9WgXcQ", fetched(("x" * characters, 0.0, 1.0)))


def test_a_transcript_too_long_to_use_is_refused_before_it_is_stored(monkeypatch) -> None:
    """Otherwise a run that can never use it would still leave it in the shared table."""
    effects = Effects(monkeypatch, found=None)
    with pytest.raises(TranscriptServiceError) as caught:
        obtain("dQw4w9WgXcQ", MONTH, fetch=lambda video_id: sized(MAX_TRANSCRIPT_CHARS + 1), now=lambda: NOW)
    assert caught.value.code == "transcript-too-long"
    assert effects.inserted == []


def test_a_transcript_exactly_at_the_limit_is_stored(monkeypatch) -> None:
    effects = Effects(monkeypatch, found=None)
    obtain("dQw4w9WgXcQ", MONTH, fetch=lambda video_id: sized(MAX_TRANSCRIPT_CHARS), now=lambda: NOW)
    assert len(effects.inserted) == 1


def test_a_failed_fetch_stores_nothing_and_keeps_its_code(monkeypatch) -> None:
    effects = Effects(monkeypatch, found=None)

    def fail(video_id: str) -> Any:
        raise TranscriptUnavailableError("No captions.")

    with pytest.raises(TranscriptUnavailableError) as caught:
        obtain("dQw4w9WgXcQ", MONTH, fetch=fail, now=lambda: NOW)
    assert caught.value.code == "no-captions"
    assert effects.inserted == []


# --- Migration 011 ------------------------------------------------------------

MIGRATION = Path(__file__).resolve().parents[2] / "database" / "011_transcripts.sql"


def migration() -> str:
    return MIGRATION.read_text()


def table_columns() -> set[str]:
    match = re.search(r"create table if not exists public\.transcripts \((.*?)\n\);", migration(), re.S)
    assert match, "could not find the transcripts table in migration 011"
    return {line.split()[0] for line in match.group(1).strip().splitlines() if line.strip()}


def test_the_row_the_backend_writes_fits_the_table() -> None:
    """Every column written exists; the rest are the table's own defaults."""
    assert set(row_for(DATA)) == table_columns() - {"id", "fetched_at"}


def test_the_reuse_query_has_its_index() -> None:
    assert re.search(r"on public\.transcripts \(video_id, fetched_at desc\)", migration())


def test_a_stored_transcript_cannot_be_changed() -> None:
    sql = migration()
    assert "before update on public.transcripts" in sql
    assert "for each row execute function public.transcripts_refuse_update()" in sql


def test_clients_can_neither_read_nor_write_transcripts() -> None:
    sql = migration()
    assert "alter table public.transcripts enable row level security;" in sql
    assert "revoke all on public.transcripts from anon, authenticated;" in sql
    assert "create policy" not in sql


@pytest.mark.parametrize("table", ["generation_jobs", "generated_content"])
def test_jobs_and_content_record_their_transcript(table: str) -> None:
    pattern = (
        rf"alter table public\.{table}\s+add column if not exists transcript_id uuid "
        r"references public\.transcripts \(id\);"
    )
    assert re.search(pattern, migration())
