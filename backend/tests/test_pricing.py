"""
Pricing: what a generation costs, at every boundary that changes it.

Pure — no database, no network.
"""

from typing import get_args

import pytest

from app.services.pricing import BASE_PRICE, HOUR_SECONDS, price_for
from app.services.prompts import ContentType


def test_every_format_the_product_offers_has_a_price() -> None:
    assert set(BASE_PRICE) == set(get_args(ContentType))


@pytest.mark.parametrize(
    ("content_type", "price"),
    [("summary", 1), ("flashcards", 1), ("quiz", 1), ("social", 1), ("notes", 2), ("research", 2), ("blog", 2)],
)
def test_the_base_prices_are_the_decided_ones(content_type: ContentType, price: int) -> None:
    assert price_for(content_type, 600) == price


@pytest.mark.parametrize(
    ("length", "extra"),
    [
        (1, 0),
        (59 * 60 + 59, 0),
        (HOUR_SECONDS, 0),
        (HOUR_SECONDS + 1, 1),
        (2 * HOUR_SECONDS, 1),
        (2 * HOUR_SECONDS + 1, 2),
        (10 * HOUR_SECONDS, 9),
    ],
)
def test_each_started_hour_past_the_first_adds_one(length: int, extra: int) -> None:
    for content_type, base in BASE_PRICE.items():
        assert price_for(content_type, length) == base + extra


def test_a_long_video_is_priced_rather_than_capped() -> None:
    """Decided: no length cap at the start; the token check is the authority on too long."""
    assert price_for("research", 24 * HOUR_SECONDS) == 2 + 23


@pytest.mark.parametrize("length", [0, -1, 1.5, True, None, "3600"])
def test_a_length_that_is_not_a_positive_whole_number_is_refused(length: object) -> None:
    with pytest.raises(ValueError):
        price_for("summary", length)  # type: ignore[arg-type]


def test_a_format_with_no_price_is_refused() -> None:
    with pytest.raises(ValueError):
        price_for("podcast", 600)  # type: ignore[arg-type]
