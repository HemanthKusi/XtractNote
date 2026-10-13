"""
Fetching captions: every request to YouTube has a timeout, and a request that
fails or never answers becomes a transcript failure the job can record.

The captions library is replaced with a stand-in, so no request leaves the
machine.
"""

from typing import Any

import pytest
import requests

from app.services import transcript
from app.services.transcript import (
    CAPTION_REQUEST_TIMEOUT_SECONDS,
    TranscriptServiceError,
    _TimeoutSession,
    fetch_transcript,
)


def test_a_request_without_a_timeout_is_given_one(monkeypatch) -> None:
    sent: dict[str, Any] = {}
    monkeypatch.setattr(requests.Session, "request", lambda self, method, url, **kwargs: sent.update(kwargs))
    _TimeoutSession(12.0).request("GET", "https://www.youtube.com/watch")
    assert sent["timeout"] == 12.0


def test_a_request_that_sets_its_own_timeout_keeps_it(monkeypatch) -> None:
    sent: dict[str, Any] = {}
    monkeypatch.setattr(requests.Session, "request", lambda self, method, url, **kwargs: sent.update(kwargs))
    _TimeoutSession(12.0).request("GET", "https://www.youtube.com/watch", timeout=3)
    assert sent["timeout"] == 3


class FakeApi:
    """Stands in for YouTubeTranscriptApi; records its session and raises as told."""

    made: list["FakeApi"] = []

    def __init__(self, http_client: Any = None, **_: Any) -> None:
        self.http_client = http_client
        FakeApi.made.append(self)

    def list(self, video_id: str) -> Any:
        raise FakeApi.list_raises


@pytest.fixture
def api(monkeypatch: pytest.MonkeyPatch) -> type[FakeApi]:
    FakeApi.made = []
    FakeApi.list_raises = requests.Timeout("read timed out")
    monkeypatch.setattr(transcript, "YouTubeTranscriptApi", FakeApi)
    return FakeApi


def test_the_captions_library_is_given_the_timeout_session(api) -> None:
    with pytest.raises(TranscriptServiceError):
        fetch_transcript("dQw4w9WgXcQ")
    (made,) = api.made
    assert isinstance(made.http_client, _TimeoutSession)
    assert made.http_client._timeout == CAPTION_REQUEST_TIMEOUT_SECONDS


@pytest.mark.parametrize(
    "error", [requests.Timeout("read timed out"), requests.ConnectionError("no route to host")]
)
def test_a_request_that_fails_or_never_answers_is_a_transcript_failure(api, error) -> None:
    """Not an unexpected crash: the job records it with a code the page has copy for."""
    api.list_raises = error
    with pytest.raises(TranscriptServiceError) as caught:
        fetch_transcript("dQw4w9WgXcQ")
    assert caught.value.code == "transcript-failed"
