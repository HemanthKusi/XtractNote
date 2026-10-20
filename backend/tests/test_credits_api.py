"""
The credits endpoints, through the real app.

The signed-in user, the balance read and the YouTube length lookup are
stand-ins, so no request reaches the database or YouTube. The app is not
entered as a context manager, so its lifespan (and the sweep) never runs.
"""

from datetime import datetime, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.api import credits as credits_api
from app.api.dependencies import CurrentUser, get_current_user
from app.config import settings
from app.main import app
from app.services.credits import CreditBalance, CreditError
from app.services.pricing import BASE_PRICE
from app.services.video_length import LengthError

USER = "e6a969d8-0000-0000-0000-000000000001"
OTHER = "e6a969d8-0000-0000-0000-000000000002"
VIDEO = "dQw4w9WgXcQ"
REFILL = datetime(2026, 10, 30, 19, 30, 49, tzinfo=timezone.utc)


class FakeBalance:
    """Stands in for `balance_for`: records whose balance was read."""

    def __init__(self) -> None:
        self.read: list[str] = []
        self.raises: Exception | None = None

    def __call__(self, user_id: str) -> CreditBalance:
        self.read.append(user_id)
        if self.raises:
            raise self.raises
        return CreditBalance(balance=28, next_refill_at=REFILL)


class FakeLength:
    """Stands in for the YouTube length lookup: answers `seconds`, or raises."""

    def __init__(self) -> None:
        self.seconds = 214
        self.raises: Exception | None = None
        self.asked: list[str] = []

    def __call__(self, video_id: str) -> int:
        self.asked.append(video_id)
        if self.raises:
            raise self.raises
        return self.seconds


@pytest.fixture
def balance(monkeypatch: pytest.MonkeyPatch) -> FakeBalance:
    fake = FakeBalance()
    monkeypatch.setattr(credits_api, "balance_for", fake)
    return fake


@pytest.fixture
def length(monkeypatch: pytest.MonkeyPatch) -> FakeLength:
    fake = FakeLength()
    monkeypatch.setattr(credits_api, "video_length", fake)
    return fake


@pytest.fixture
def client(balance: FakeBalance, length: FakeLength):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=USER)
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def signed_out(balance: FakeBalance, length: FakeLength):
    """The real sign-in check, with no token sent: refused before any lookup."""
    app.dependency_overrides.clear()
    yield TestClient(app)


# --- The balance --------------------------------------------------------------


def test_the_balance_is_the_callers_with_its_allowance_and_refill_time(client, balance) -> None:
    response = client.get("/api/credits")
    assert response.status_code == 200
    assert response.json() == {
        "balance": 28,
        "allowance": settings.credits_per_month,
        "nextRefillAt": "2026-10-30T19:30:49+00:00",
    }
    assert balance.read == [USER]


def test_the_allowance_is_the_setting_refills_reset_to(client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "credits_per_month", 12)
    assert client.get("/api/credits").json()["allowance"] == 12


def test_a_user_named_in_the_request_reads_the_callers_own_balance(client, balance) -> None:
    response = client.get("/api/credits", params={"userId": OTHER, "user_id": OTHER}, headers={"X-User-Id": OTHER})
    assert response.status_code == 200
    assert balance.read == [USER]


@pytest.mark.parametrize("error", [CreditError("no-sign-up", "none"), RuntimeError("database down")])
def test_a_balance_that_cannot_be_read_is_a_503(client, balance, error: Exception) -> None:
    balance.raises = error
    response = client.get("/api/credits")
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "balance-unavailable"
    assert "database down" not in response.text


def test_the_balance_needs_sign_in(signed_out, balance) -> None:
    assert signed_out.get("/api/credits").status_code == 401
    assert balance.read == []


# --- The quote ----------------------------------------------------------------


def test_a_quote_prices_every_format_on_the_videos_length(client, length) -> None:
    length.seconds = 4_800
    response = client.get("/api/credits/quote", params={"videoId": VIDEO})
    assert response.status_code == 200
    body: dict[str, Any] = response.json()
    assert body["videoId"] == VIDEO and body["lengthSeconds"] == 4_800
    assert body["prices"] == {
        "summary": 2,
        "flashcards": 2,
        "quiz": 2,
        "social": 2,
        "notes": 3,
        "research": 3,
        "blog": 3,
    }
    assert set(body["prices"]) == set(BASE_PRICE)


def test_a_quote_asks_youtube_once_for_all_formats(client, length) -> None:
    client.get("/api/credits/quote", params={"videoId": VIDEO})
    assert length.asked == [VIDEO]


@pytest.mark.parametrize("video_id", ["short", "dQw4w9WgXcQx", "dQw4w9WgXc!", "dQw4w9WgXcQ,aaaaaaaaaaa"])
def test_a_malformed_video_id_is_refused_without_a_lookup(client, length, video_id: str) -> None:
    assert client.get("/api/credits/quote", params={"videoId": video_id}).status_code == 422
    assert length.asked == []


@pytest.mark.parametrize(
    "code,status",
    [
        ("video-not-found", 422),
        ("video-has-no-length", 422),
        ("length-unavailable", 503),
        ("youtube-misconfigured", 503),
    ],
)
def test_a_length_that_cannot_be_known_is_refused_as_a_start_refuses_it(client, length, code, status) -> None:
    length.raises = LengthError(code, "no length")
    response = client.get("/api/credits/quote", params={"videoId": VIDEO})
    assert response.status_code == status
    assert response.json()["detail"]["code"] == code
    assert ("Retry-After" in response.headers) is (status == 503)


def test_a_quote_needs_sign_in(signed_out, length) -> None:
    assert signed_out.get("/api/credits/quote", params={"videoId": VIDEO}).status_code == 401
    assert length.asked == []
