"""
XtractNote — Pricing

What a generation costs in credits: a fixed price per format, plus one credit
for each started hour of video past the first.

Pure: no database, no network. `services/video_length.py` looks the length
up from YouTube.
"""

from math import ceil

from app.services.prompts import ContentType

#: The price of each format for a video up to an hour long. Social is one
#: price for every platform.
BASE_PRICE: dict[ContentType, int] = {
    "summary": 1,
    "flashcards": 1,
    "quiz": 1,
    "social": 1,
    "notes": 2,
    "research": 2,
    "blog": 2,
}

HOUR_SECONDS = 3_600


def price_for(content_type: ContentType, length_seconds: int) -> int:
    """
    The credits a generation of `content_type` costs on a video this long.

    An hour or less costs the base price; each started hour past the first
    adds one: 1:00:00 is the base price, 1:00:01 is one more.

    Raises ValueError for a format with no price or a length that is not a
    positive whole number of seconds.
    """
    if content_type not in BASE_PRICE:
        raise ValueError(f"No price for content type {content_type!r}.")
    if isinstance(length_seconds, bool) or not isinstance(length_seconds, int) or length_seconds < 1:
        raise ValueError(f"A length must be a positive whole number of seconds, not {length_seconds!r}.")
    extra_hours = ceil(length_seconds / HOUR_SECONDS) - 1
    return BASE_PRICE[content_type] + extra_hours
