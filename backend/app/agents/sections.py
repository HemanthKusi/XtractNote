"""
XtractNote — Sections of a transcript

A transcript is a run of short caption lines. `sections_of` groups them into
sections of a few minutes each, so analysis and drafting can refer to a part of
the video by number and time — the unit per-section provenance points at.

**Where a section ends.** Inside the window from `MIN_SECONDS` to `MAX_SECONDS`
after a section starts, it ends at the longest pause between two captions;
among pauses of equal length, the latest. Auto-generated captions often carry
no punctuation, so a pause is the most dependable sign of a new thought. A
caption that alone runs past `MAX_SECONDS` is a section of its own, a window
with no boundary in it ends at the last boundary before `MAX_SECONDS`, and
whatever is left once it fits within `MAX_SECONDS` is the last section.

Pure, and deterministic: the same caption lines always give the same sections.
"""

from dataclasses import dataclass
from typing import Sequence

from app.services.transcript import TranscriptSegment, join_segment_texts

#: A section may end once it has run this long, in seconds.
MIN_SECONDS = 120.0
#: And it ends before it would run longer than this.
MAX_SECONDS = 180.0


@dataclass(frozen=True)
class Section:
    """A run of consecutive caption lines, numbered from 0."""

    index: int
    start: float
    end: float
    text: str


def sections_of(
    segments: Sequence[TranscriptSegment],
    min_seconds: float = MIN_SECONDS,
    max_seconds: float = MAX_SECONDS,
) -> list[Section]:
    """
    `segments` grouped into sections, every segment in exactly one, in order.

    Raises ValueError when `min_seconds` is not below `max_seconds`.
    """
    if not 0 < min_seconds < max_seconds:
        raise ValueError("a section's minimum must be positive and below its maximum")
    groups: list[Sequence[TranscriptSegment]] = []
    first = 0
    while first < len(segments):
        last = _last_of_section(segments, first, min_seconds, max_seconds)
        groups.append(segments[first : last + 1])
        first = last + 1
    return [
        Section(
            index=index,
            start=group[0].start,
            end=round(max(_end(segment) for segment in group), 3),
            text=join_segment_texts(segment.text for segment in group),
        )
        for index, group in enumerate(groups)
    ]


def _end(segment: TranscriptSegment) -> float:
    return segment.start + segment.duration


def _last_of_section(
    segments: Sequence[TranscriptSegment], first: int, min_seconds: float, max_seconds: float
) -> int:
    """The index of the last segment in the section that begins at `first`."""
    start = segments[first].start
    if _end(segments[-1]) - start <= max_seconds:
        # Everything left fits in one section, so it is not split into a
        # section and a scrap.
        return len(segments) - 1
    # A boundary after `last` is a candidate when the section would then have
    # run between the minimum and the maximum.
    candidates: list[tuple[float, int]] = []
    last_fitting = first
    for last in range(first, len(segments) - 1):
        elapsed = _end(segments[last]) - start
        if elapsed > max_seconds:
            break
        last_fitting = last
        if elapsed >= min_seconds:
            pause = max(0.0, segments[last + 1].start - _end(segments[last]))
            candidates.append((pause, last))
    if candidates:
        # Longest pause; among equals, the latest.
        return max(candidates)[1]
    return last_fitting
