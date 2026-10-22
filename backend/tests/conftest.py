"""
Shared test fixtures.

`rate_limit` stands in for the limiter the routes call, in every test, so no
route test reaches the database through it. A test that needs a refusal sets
`raises` on the fixture it is handed.
"""

import pytest

from app.api import rate_limits
from app.services.rate_limit import Bucket


class FakeRateLimit:
    """Stands in for `consume`: records each use taken, or raises `raises`."""

    def __init__(self) -> None:
        self.taken: list[tuple[str, Bucket]] = []
        self.raises: Exception | None = None

    def __call__(self, user_id: str, bucket: Bucket) -> None:
        if self.raises:
            raise self.raises
        self.taken.append((user_id, bucket))


@pytest.fixture(autouse=True)
def rate_limit(monkeypatch: pytest.MonkeyPatch) -> FakeRateLimit:
    fake = FakeRateLimit()
    monkeypatch.setattr(rate_limits, "consume", fake)
    return fake
