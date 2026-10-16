"""
Sectioning a transcript: where sections end, and what they must never do —
lose text, change it, reorder it, or put one caption in two sections.
"""

import random

import pytest

from app.agents.sections import MAX_SECONDS, MIN_SECONDS, Section, sections_of
from app.services.transcript import TranscriptSegment, join_segment_texts


def line(start: float, duration: float = 4.0, text: str | None = None) -> TranscriptSegment:
    return TranscriptSegment(text=text or f"at {start:g}", start=start, duration=duration)


def even(seconds: float, every: float = 5.0, duration: float = 4.0) -> list[TranscriptSegment]:
    """Captions every `every` seconds, each `duration` long — a 1s pause between."""
    count = int(seconds // every)
    return [line(i * every, duration) for i in range(count)]


def partitions(segments: list[TranscriptSegment], sections: list[Section]) -> bool:
    """Every caption in exactly one section, in order: the sections rebuild the captions."""
    texts = [segment.text for segment in segments]
    rebuilt = " ".join(section.text for section in sections)
    return join_segment_texts([rebuilt]) == join_segment_texts(texts)


# --- What must always hold ----------------------------------------------------


@pytest.mark.parametrize("seconds", [3, 60, 125, 179, 181, 600, 3_600])
def test_no_text_is_lost_or_changed(seconds: int) -> None:
    segments = even(seconds)
    assert partitions(segments, sections_of(segments))


def test_sections_are_numbered_from_zero_in_time_order() -> None:
    sections = sections_of(even(900))
    assert [section.index for section in sections] == list(range(len(sections)))
    assert all(a.start < b.start for a, b in zip(sections, sections[1:]))
    assert all(a.end <= b.start for a, b in zip(sections, sections[1:]))


def test_the_same_captions_always_give_the_same_sections() -> None:
    rng = random.Random(7)
    segments, t = [], 0.0
    for _ in range(600):
        duration = rng.uniform(1, 6)
        segments.append(line(round(t, 3), round(duration, 3)))
        t += duration + rng.choice([0.0, 0.2, 0.5, 2.0])
    assert sections_of(segments) == sections_of(list(segments))
    assert partitions(segments, sections_of(segments))


def test_a_section_spans_its_first_start_to_its_latest_end() -> None:
    (section,) = sections_of([line(10.0, 3.0), line(12.0, 5.0)])
    assert (section.start, section.end) == (10.0, 17.0)


def test_no_captions_is_no_sections() -> None:
    assert sections_of([]) == []


# --- Where a section ends -----------------------------------------------------


def test_a_short_transcript_is_one_section() -> None:
    segments = even(90)
    assert len(sections_of(segments)) == 1


def test_a_tail_that_fits_is_not_split_into_a_section_and_a_scrap() -> None:
    """Up to MAX_SECONDS left over is one section, even with pauses in the window."""
    segments = even(MAX_SECONDS - 10)
    assert len(sections_of(segments)) == 1


def test_a_section_ends_at_the_longest_pause_inside_its_window() -> None:
    # Even 1s pauses, except a 6s pause after the caption ending at 149s.
    segments = [line(t) for t in range(0, 145, 5)] + [line(t) for t in range(155, 400, 5)]
    first = sections_of(segments)[0]
    assert first.end == 144.0


def test_a_pause_outside_the_window_is_not_used() -> None:
    # A long pause at 60s comes before the minimum; it must not end a section.
    segments = [line(t) for t in range(0, 60, 5)] + [line(t) for t in range(90, 400, 5)]
    first = sections_of(segments)[0]
    assert first.end - first.start >= MIN_SECONDS


def test_without_pauses_a_section_ends_at_its_time_limit() -> None:
    """Back-to-back captions: every pause is zero, so the latest boundary in the window wins."""
    segments = even(600, every=5.0, duration=5.0)
    for section in sections_of(segments)[:-1]:
        assert MIN_SECONDS <= section.end - section.start <= MAX_SECONDS
        assert section.end - section.start > MAX_SECONDS - 5.0


def test_every_section_but_the_last_runs_between_the_limits_when_captions_allow() -> None:
    for section in sections_of(even(3_600))[:-1]:
        assert MIN_SECONDS <= section.end - section.start <= MAX_SECONDS


def test_a_caption_longer_than_a_section_is_a_section_of_its_own() -> None:
    segments = [line(0.0, 4.0), line(5.0, MAX_SECONDS + 60), line(MAX_SECONDS + 70, 4.0)] + [
        line(MAX_SECONDS + 75 + 5 * i) for i in range(60)
    ]
    sections = sections_of(segments)
    long_one = [s for s in sections if s.text == "at 5"]
    assert len(long_one) == 1 and partitions(segments, sections)


def test_a_gap_that_jumps_past_the_limit_ends_the_section_before_it() -> None:
    """Captions until 60s, then nothing until 400s: the first section stops at 60s."""
    segments = even(60) + [line(400.0 + 5 * i) for i in range(10)]
    sections = sections_of(segments)
    assert sections[0].end <= 60.0
    assert partitions(segments, sections)


def test_overlapping_captions_are_handled() -> None:
    """Auto-generated captions overlap; a negative pause counts as none."""
    segments = [line(t * 2.0, 4.0) for t in range(200)]
    sections = sections_of(segments)
    assert partitions(segments, sections)
    assert all(s.end - s.start <= MAX_SECONDS + 4.0 for s in sections)


@pytest.mark.parametrize(("low", "high"), [(180.0, 120.0), (120.0, 120.0), (0.0, 60.0)])
def test_limits_that_cannot_be_met_are_refused(low: float, high: float) -> None:
    with pytest.raises(ValueError):
        sections_of(even(300), low, high)
