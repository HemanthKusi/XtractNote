"""
XtractNote — Draft rows

Builds and inserts the `generated_content` row a finished generation produces.

A generation that runs in the background has no browser waiting to save its
result, so the row is written here, with status 'draft'. Saving it to the
library is a separate step.

**History, the drafts band and `/output/[id]` read these rows without knowing
who wrote them**, so the row is built to the shape they already read: the word
count, the social title, where the platform is stored, the duration format.

**Two layers, as in `jobs.py`.** The rules are pure functions, testable without a
database. The insert is a thin shell around them.

**The service key bypasses row-level security**, so the policy that would check
`user_id` on this insert never fires. The owner is therefore whatever the caller
passes — and the caller must pass the verified user, never a value from request
data.
"""

import math
import re
from dataclasses import dataclass
from typing import Any

from app.db.supabase import get_supabase_client
from app.services.prompts import ContentType, SocialPlatform

CONTENT_TABLE = "generated_content"

#: The status a generated row is written with. Save promotes it to 'saved'.
DRAFT_STATUS = "draft"

#: The display label for each platform, used in a social item's title.
#: Mirrors `SOCIAL_PLATFORMS` in `frontend/src/lib/content/types.ts`; a test
#: reads that file and fails if the two disagree.
SOCIAL_PLATFORM_LABELS: dict[SocialPlatform, str] = {
    "linkedin": "LinkedIn post",
    "x-thread": "X thread",
    "instagram": "Instagram caption",
    "youtube-description": "YouTube description",
    "newsletter": "Newsletter snippet",
}

_WHITESPACE_RE = re.compile(r"\s+")


# --- Typed error --------------------------------------------------------------

class DraftError(Exception):
    """Raised when the draft row cannot be written. `code` is a stable string."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


# --- The video the content came from ------------------------------------------

@dataclass(frozen=True)
class VideoSource:
    """The source video's details, as the request supplies them."""

    video_id: str
    url: str
    title: str
    channel: str
    thumbnail_url: str
    duration_seconds: float | None = None


# --- Pure rules ---------------------------------------------------------------

def count_words(text: str) -> int:
    """Whitespace-separated words, the rule `countWords` uses in the browser."""
    trimmed = text.strip()
    return len(_WHITESPACE_RE.split(trimmed)) if trimmed else 0


def count_body_words(body: dict[str, Any]) -> int:
    """
    Word count across any body shape.

    History cards show this as a size indicator. For flashcards and quiz it is
    the visible text of every item — prompt, answer, options, explanation — so a
    structured item does not read as "0 words".
    """
    kind = body.get("kind")
    if kind == "flashcards":
        return sum(
            count_words(card["front"]) + count_words(card["back"])
            for card in body["cards"]
        )
    if kind == "quiz":
        return sum(
            count_words(question["question"])
            + sum(count_words(option) for option in question["options"])
            + count_words(question.get("explanation") or "")
            for question in body["questions"]
        )
    return count_words(body["markdown"])


def format_duration(seconds: float | None) -> str | None:
    """
    Seconds → "M:SS" for the `video_duration` text column, or None if unknown.

    A negative or non-finite value is treated as unknown rather than formatted.
    """
    if seconds is None or not math.isfinite(seconds) or seconds < 0:
        return None
    minutes = math.floor(seconds / 60)
    remainder = math.floor(seconds % 60)
    return f"{minutes}:{remainder:02d}"


def platform_for(
    content_type: ContentType, platform: SocialPlatform | None
) -> SocialPlatform | None:
    """The platform to record: social's own, and None for every other type."""
    return platform if content_type == "social" else None


def content_title(
    content_type: ContentType, platform: SocialPlatform | None, video_title: str
) -> str:
    """
    The item's title.

    A social item is prefixed with its platform — "LinkedIn post — <title>" — so
    several platform variants of one video are distinguishable in History.
    Every other type uses the video's title.
    """
    recorded = platform_for(content_type, platform)
    if recorded is None:
        return video_title
    return f"{SOCIAL_PLATFORM_LABELS[recorded]} — {video_title}"


def build_draft_row(
    user_id: str,
    video: VideoSource,
    content_type: ContentType,
    platform: SocialPlatform | None,
    body: dict[str, Any],
) -> dict[str, Any]:
    """
    The `generated_content` row for one finished generation.

    `metadata` is `{"platform": ...}` for social and None otherwise — not `{}` —
    so "social items with a platform" stays a plain `is not null` query.
    `folder_id` and `content_html` are left to their column defaults.
    """
    recorded = platform_for(content_type, platform)
    return {
        "user_id": user_id,
        "video_url": video.url,
        "video_id": video.video_id,
        "video_title": video.title,
        "video_channel": video.channel,
        "video_thumbnail": video.thumbnail_url,
        "video_duration": format_duration(video.duration_seconds),
        "content_type": content_type,
        "content_title": content_title(content_type, platform, video.title),
        "content_body": body,
        "metadata": {"platform": recorded} if recorded is not None else None,
        "status": DRAFT_STATUS,
        "word_count": count_body_words(body),
    }


# --- Write --------------------------------------------------------------------

def insert_draft(row: dict[str, Any]) -> str:
    """
    Insert a draft row and return its id.

    Raises DraftError("draft-not-saved") when the insert returns nothing, rather
    than handing back an id of None to fail somewhere less obvious later.
    """
    response = get_supabase_client().table(CONTENT_TABLE).insert(row).execute()
    if not response.data:
        raise DraftError("draft-not-saved", "The draft could not be saved.")
    return str(response.data[0]["id"])
