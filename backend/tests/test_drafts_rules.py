"""
Draft rows: the rules layer.

`drafts.py` builds the `generated_content` row a finished generation produces,
and existing readers — History, the drafts band, `/output/[id]` — read that row
without knowing the backend wrote it. These tests pin the rules that decide its
shape. No network, no database, nothing mocked.

The insert itself is not covered here; it is exercised against the real
database.
"""

import math
import re
from pathlib import Path
from typing import get_args

import pytest

from app.services.drafts import (
    DRAFT_STATUS,
    SOCIAL_PLATFORM_LABELS,
    VideoSource,
    build_draft_row,
    content_title,
    count_body_words,
    count_words,
    format_duration,
    platform_for,
)
from app.services.prompts import ContentType, SocialPlatform

REPO = Path(__file__).resolve().parents[2]
CONTENT_MIGRATION = REPO / "database" / "003_create_content.sql"
FRONTEND_TYPES = REPO / "frontend" / "src" / "lib" / "content" / "types.ts"

VIDEO = VideoSource(
    video_id="dQw4w9WgXcQ",
    url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title="How tides work",
    channel="Ocean Notes",
    thumbnail_url="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    duration_seconds=754,
)

PROSE = {"markdown": "Tides follow the moon."}


# --- The code and its counterparts must agree ---------------------------------


def test_draft_status_is_allowed_by_the_check_constraint() -> None:
    """'draft' is one of the values migration 003 allows for `status`."""
    sql = CONTENT_MIGRATION.read_text()
    match = re.search(r"check\s*\(\s*status\s+in\s*\((.*?)\)\s*\)", sql, re.S | re.I)
    assert match, "could not find the status CHECK constraint in migration 003"
    assert DRAFT_STATUS in re.findall(r"'([a-z_]+)'", match.group(1))


def test_platform_labels_match_the_frontend() -> None:
    """
    The labels are the frontend's labels.

    A social title is built from them, and the frontend shows the same strings in
    its picker and output header. Renamed in one place only, History would carry
    two spellings for one kind of item, and nothing would fail.
    """
    source = FRONTEND_TYPES.read_text()
    frontend = dict(re.findall(r'id:\s*"([^"]+)",\s*label:\s*"([^"]+)"', source))
    assert frontend == SOCIAL_PLATFORM_LABELS


def test_every_platform_has_a_label() -> None:
    assert set(SOCIAL_PLATFORM_LABELS) == set(get_args(SocialPlatform))


# --- Word counts --------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("", 0),
        ("   \n\t ", 0),
        ("one", 1),
        ("  two  words \n", 2),
        ("tabs\tand\nnewlines  count", 4),
    ],
)
def test_count_words(text: str, expected: int) -> None:
    assert count_words(text) == expected


def test_prose_counts_its_markdown() -> None:
    assert count_body_words({"markdown": "# Title\n\nThree more words"}) == 5


def test_flashcards_count_both_sides_of_every_card() -> None:
    body = {
        "kind": "flashcards",
        "cards": [
            {"front": "What pulls tides?", "back": "The moon"},
            {"front": "Spring tide", "back": "Sun and moon aligned"},
        ],
    }
    assert count_body_words(body) == 3 + 2 + 2 + 4


def test_quiz_counts_question_options_and_explanation() -> None:
    body = {
        "kind": "quiz",
        "questions": [
            {
                "question": "What pulls tides?",
                "options": ["The moon", "Wind"],
                "answerIndex": 0,
                "explanation": "Gravity, mostly lunar.",
            },
        ],
    }
    assert count_body_words(body) == 3 + 2 + 1 + 3


@pytest.mark.parametrize("explanation", [None, ""])
def test_quiz_without_an_explanation_counts_the_rest(explanation: str | None) -> None:
    body = {
        "kind": "quiz",
        "questions": [
            {
                "question": "Tides?",
                "options": ["Yes", "No"],
                "answerIndex": 0,
                "explanation": explanation,
            },
        ],
    }
    assert count_body_words(body) == 3


def test_quiz_with_no_explanation_key_counts_the_rest() -> None:
    body = {
        "kind": "quiz",
        "questions": [{"question": "Tides?", "options": ["Yes", "No"], "answerIndex": 0}],
    }
    assert count_body_words(body) == 3


# --- Duration -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("seconds", "expected"),
    [
        (0, "0:00"),
        (5, "0:05"),
        (59.9, "0:59"),
        (61, "1:01"),
        (754, "12:34"),
        (3600, "60:00"),
    ],
)
def test_format_duration(seconds: float, expected: str) -> None:
    assert format_duration(seconds) == expected


@pytest.mark.parametrize("seconds", [None, math.nan, math.inf, -math.inf, -1])
def test_unknown_or_impossible_duration_is_none(seconds: float | None) -> None:
    assert format_duration(seconds) is None


# --- Title and platform -------------------------------------------------------


NON_SOCIAL: list[ContentType] = [t for t in get_args(ContentType) if t != "social"]


@pytest.mark.parametrize("content_type", NON_SOCIAL)
def test_non_social_title_is_the_video_title(content_type: ContentType) -> None:
    assert content_title(content_type, None, VIDEO.title) == VIDEO.title


@pytest.mark.parametrize("content_type", NON_SOCIAL)
def test_a_stray_platform_does_not_reach_a_non_social_item(
    content_type: ContentType,
) -> None:
    assert platform_for(content_type, "linkedin") is None
    assert content_title(content_type, "linkedin", VIDEO.title) == VIDEO.title


@pytest.mark.parametrize("platform", get_args(SocialPlatform))
def test_social_title_is_prefixed_with_its_platform(platform: SocialPlatform) -> None:
    expected = f"{SOCIAL_PLATFORM_LABELS[platform]} — {VIDEO.title}"
    assert content_title("social", platform, VIDEO.title) == expected


# --- The row ------------------------------------------------------------------

#: The columns the browser's insert wrote, and no others.
ROW_COLUMNS = {
    "user_id",
    "video_url",
    "video_id",
    "video_title",
    "video_channel",
    "video_thumbnail",
    "video_duration",
    "content_type",
    "content_title",
    "content_body",
    "metadata",
    "status",
    "word_count",
}


def test_row_writes_exactly_the_expected_columns() -> None:
    row = build_draft_row("user-1", VIDEO, "summary", None, PROSE)
    assert set(row) == ROW_COLUMNS


def test_row_is_a_draft_owned_by_the_given_user() -> None:
    row = build_draft_row("user-1", VIDEO, "summary", None, PROSE)
    assert row["status"] == "draft"
    assert row["user_id"] == "user-1"


def test_row_carries_the_video() -> None:
    row = build_draft_row("user-1", VIDEO, "summary", None, PROSE)
    assert row["video_id"] == VIDEO.video_id
    assert row["video_url"] == VIDEO.url
    assert row["video_title"] == VIDEO.title
    assert row["video_channel"] == VIDEO.channel
    assert row["video_thumbnail"] == VIDEO.thumbnail_url
    assert row["video_duration"] == "12:34"


def test_row_carries_the_body_and_its_word_count() -> None:
    row = build_draft_row("user-1", VIDEO, "summary", None, PROSE)
    assert row["content_body"] is PROSE
    assert row["word_count"] == 4


@pytest.mark.parametrize("content_type", NON_SOCIAL)
def test_non_social_row_has_no_metadata(content_type: ContentType) -> None:
    row = build_draft_row("user-1", VIDEO, content_type, "linkedin", PROSE)
    assert row["metadata"] is None
    assert row["content_type"] == content_type


@pytest.mark.parametrize("platform", get_args(SocialPlatform))
def test_social_row_records_its_platform(platform: SocialPlatform) -> None:
    row = build_draft_row("user-1", VIDEO, "social", platform, PROSE)
    assert row["metadata"] == {"platform": platform}
    assert row["content_title"].startswith(SOCIAL_PLATFORM_LABELS[platform])


def test_unknown_duration_is_stored_as_null() -> None:
    video = VideoSource(
        video_id=VIDEO.video_id,
        url=VIDEO.url,
        title=VIDEO.title,
        channel=VIDEO.channel,
        thumbnail_url=VIDEO.thumbnail_url,
    )
    row = build_draft_row("user-1", video, "summary", None, PROSE)
    assert row["video_duration"] is None
