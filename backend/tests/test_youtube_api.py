"""
The YouTube endpoints, through the real app: who may call them, and the
hourly limit each call takes a use of before YouTube is asked anything.

The signed-in user, the limiter (tests/conftest.py), YouTube's HTTP API and the
search service are stand-ins, so no request reaches the database or YouTube.
"""

import json
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api import youtube as youtube_api
from app.api.dependencies import CurrentUser, get_current_user
from app.config import settings
from app.main import app
from app.services.rate_limit import RateLimited

USER = "e6a969d8-0000-0000-0000-000000000001"
VIDEO = "dQw4w9WgXcQ"

VIDEO_ANSWER = {
    "items": [
        {
            "snippet": {"title": "How tides work", "channelTitle": "Ocean Notes", "channelId": "UC1", "thumbnails": {}},
            "contentDetails": {"duration": "PT3M34S"},
        }
    ]
}


class FakeYouTube:
    """Stands in for YouTube: records each call the routes make to it."""

    def __init__(self) -> None:
        self.metadata_calls: list[httpx.Request] = []
        self.searches: list[str] = []

    def transport(self) -> httpx.MockTransport:
        def handler(request: httpx.Request) -> httpx.Response:
            self.metadata_calls.append(request)
            return httpx.Response(200, content=json.dumps(VIDEO_ANSWER).encode())

        return httpx.MockTransport(handler)

    async def search(self, query: str, api_key: str, max_results: int = 30) -> list[Any]:
        self.searches.append(query)
        return []


@pytest.fixture
def youtube(monkeypatch: pytest.MonkeyPatch) -> FakeYouTube:
    fake = FakeYouTube()
    real_client = httpx.AsyncClient

    def client(**kwargs: Any) -> httpx.AsyncClient:
        return real_client(transport=fake.transport(), **kwargs)

    monkeypatch.setattr(youtube_api.httpx, "AsyncClient", client)
    monkeypatch.setattr(youtube_api, "search_videos", fake.search)
    monkeypatch.setattr(settings, "youtube_api_key", "test-api-key-not-real")
    return fake


@pytest.fixture
def client(youtube: FakeYouTube):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=USER)
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def signed_out(youtube: FakeYouTube):
    """The real sign-in check, with no token sent."""
    app.dependency_overrides.clear()
    yield TestClient(app)


def metadata(client: TestClient, video_id: str = VIDEO):
    return client.post("/api/youtube/metadata", json={"videoId": video_id})


def search(client: TestClient, query: str = "how tides work"):
    return client.post("/api/youtube/search", json={"query": query})


# --- Sign-in ------------------------------------------------------------------


def test_metadata_needs_sign_in_and_asks_youtube_nothing(signed_out, youtube, rate_limit) -> None:
    response = metadata(signed_out)
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not-authenticated"
    assert youtube.metadata_calls == [] and rate_limit.taken == []


def test_search_needs_sign_in_and_asks_youtube_nothing(signed_out, youtube, rate_limit) -> None:
    response = search(signed_out)
    assert response.status_code == 401
    assert youtube.searches == [] and rate_limit.taken == []


# --- Each call takes one use of its own bucket --------------------------------


def test_metadata_takes_one_metadata_use_for_the_caller(client, youtube, rate_limit) -> None:
    response = metadata(client)
    assert response.status_code == 200
    assert response.json()["title"] == "How tides work"
    assert rate_limit.taken == [(USER, "youtube-metadata")]
    assert len(youtube.metadata_calls) == 1


def test_search_takes_one_search_use_for_the_caller(client, youtube, rate_limit) -> None:
    assert search(client).status_code == 200
    assert rate_limit.taken == [(USER, "youtube-search")]
    assert youtube.searches == ["how tides work"]


@pytest.mark.parametrize(
    ("call", "bucket"),
    [(metadata, "youtube-metadata"), (search, "youtube-search")],
)
def test_at_the_limit_the_call_is_429_and_asks_youtube_nothing(client, youtube, rate_limit, call, bucket) -> None:
    rate_limit.raises = RateLimited(bucket, 1187)
    response = call(client)
    assert response.status_code == 429
    assert response.json()["detail"]["code"] == "rate-limited"
    assert response.json()["detail"]["retryAfterSeconds"] == 1187
    assert response.headers["Retry-After"] == "1187"
    assert youtube.metadata_calls == [] and youtube.searches == []


@pytest.mark.parametrize("call", [metadata, search])
def test_a_limit_that_cannot_be_checked_is_503_and_asks_youtube_nothing(client, youtube, rate_limit, call) -> None:
    rate_limit.raises = RuntimeError("database down")
    response = call(client)
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "rate-limit-unavailable"
    assert response.headers["Retry-After"] == "30"
    assert "database down" not in response.text
    assert youtube.metadata_calls == [] and youtube.searches == []


def test_a_malformed_video_id_takes_no_use(client, youtube, rate_limit) -> None:
    assert metadata(client, "short").status_code == 400
    assert rate_limit.taken == [] and youtube.metadata_calls == []


def test_a_blank_search_takes_no_use(client, youtube, rate_limit) -> None:
    assert search(client, "   ").status_code == 400
    assert rate_limit.taken == [] and youtube.searches == []


def test_a_server_with_no_api_key_takes_no_use(client, youtube, rate_limit, monkeypatch) -> None:
    monkeypatch.setattr(settings, "youtube_api_key", "")
    assert metadata(client).status_code == 500
    assert search(client).status_code == 500
    assert rate_limit.taken == []
