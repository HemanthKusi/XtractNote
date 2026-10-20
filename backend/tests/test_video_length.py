"""
A video's length from YouTube: what is asked, and every way the answer can
fail to give a length.

No network: the HTTP client is given httpx's MockTransport, which answers
with whatever each test hands it.
"""

import json
import traceback
from typing import Any, Callable

import httpx
import pytest

from app.config import settings
from app.services.pricing import price_for
from app.services.video_length import LengthError, length_from, video_length

KEY = "test-api-key-not-real"


def answer(payload: Any) -> bytes:
    return json.dumps(payload).encode()


def video(duration: Any, broadcast: Any = "none") -> dict[str, Any]:
    return {"items": [{"snippet": {"liveBroadcastContent": broadcast}, "contentDetails": {"duration": duration}}]}


def client(handler: Callable[[httpx.Request], httpx.Response]) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


@pytest.fixture(autouse=True)
def api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "youtube_api_key", KEY)


# --- Reading the answer -------------------------------------------------------


@pytest.mark.parametrize(("duration", "seconds"), [("PT28M7S", 1687), ("PT1H0M1S", 3601), ("P1DT2H", 93600)])
def test_the_length_is_read_from_content_details(duration: str, seconds: int) -> None:
    assert length_from(200, answer(video(duration))) == seconds


def test_no_such_video_is_video_not_found() -> None:
    with pytest.raises(LengthError) as caught:
        length_from(200, answer({"items": []}))
    assert caught.value.code == "video-not-found"


@pytest.mark.parametrize(
    "payload",
    [
        video("P0D"),
        video("PT0S"),
        video(None),
        {"items": [{"snippet": {"liveBroadcastContent": "none"}, "contentDetails": {}}]},
        {"items": [{"snippet": {"liveBroadcastContent": "none"}}]},
    ],
)
def test_a_video_with_no_length_reported_has_no_length(payload: Any) -> None:
    with pytest.raises(LengthError) as caught:
        length_from(200, answer(payload))
    assert caught.value.code == "video-has-no-length"


@pytest.mark.parametrize("broadcast", ["live", "upcoming"])
@pytest.mark.parametrize("duration", ["P0D", "PT3H", "P1407DT10H11M52S"])
def test_a_live_or_upcoming_video_has_no_length_whatever_duration_it_reports(broadcast: str, duration: str) -> None:
    """Refused by its broadcast state, so a duration YouTube reports for it is never priced."""
    with pytest.raises(LengthError) as caught:
        length_from(200, answer(video(duration, broadcast)))
    assert caught.value.code == "video-has-no-length"


def test_an_ended_stream_is_priced_by_its_recorded_length() -> None:
    """A broadcast that ran 2022-07-12 to 2026-05-20, as YouTube reported it once it had ended."""
    assert length_from(200, answer(video("P1407DT10H11M52S", "none"))) == 121_601_512


@pytest.mark.parametrize(
    "payload",
    [
        video("PT28M7S", "completed"),
        video("PT28M7S", None),
        video("PT28M7S", 0),
        {"items": [{"snippet": {}, "contentDetails": {"duration": "PT28M7S"}}]},
        {"items": [{"contentDetails": {"duration": "PT28M7S"}}]},
        {"items": [{"snippet": "not an object", "contentDetails": {"duration": "PT28M7S"}}]},
    ],
)
def test_a_broadcast_state_that_cannot_be_read_is_length_unavailable(payload: Any) -> None:
    """Without a state it knows, the module cannot tell a live video from one with a length."""
    with pytest.raises(LengthError) as caught:
        length_from(200, answer(payload))
    assert caught.value.code == "length-unavailable"


@pytest.mark.parametrize(
    ("status", "body"),
    [
        (403, answer({"error": {"errors": [{"reason": "quotaExceeded"}]}})),
        (400, answer({"error": {"errors": [{"reason": "keyInvalid"}]}})),
        (500, b""),
        (200, b"<html>not json</html>"),
        (200, answer(["a list"])),
        (200, answer({"items": "not a list"})),
        (200, answer(video("an hour or so"))),
        (200, answer(video(3600))),
    ],
)
def test_an_answer_that_gives_no_readable_length_is_length_unavailable(status: int, body: bytes) -> None:
    with pytest.raises(LengthError) as caught:
        length_from(status, body)
    assert caught.value.code == "length-unavailable"


# --- The call -----------------------------------------------------------------


def test_the_call_asks_only_for_this_video_s_snippet_and_content_details() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, content=answer(video("PT28M7S")))

    assert video_length("wjZofJX0v4M", client=client(handler)) == 1687
    (request,) = seen
    assert str(request.url).startswith("https://www.googleapis.com/youtube/v3/videos?")
    assert dict(request.url.params) == {"part": "snippet,contentDetails", "id": "wjZofJX0v4M", "key": KEY}


def test_no_api_key_is_youtube_misconfigured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "youtube_api_key", "")
    with pytest.raises(LengthError) as caught:
        video_length("wjZofJX0v4M", client=client(lambda r: httpx.Response(200)))
    assert caught.value.code == "youtube-misconfigured"


@pytest.mark.parametrize("error", [httpx.ConnectError("refused"), httpx.ReadTimeout("slow")])
def test_youtube_unreachable_is_length_unavailable_and_leaks_no_key(error: httpx.HTTPError) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise type(error)(f"failed calling {request.url}", request=request)

    with pytest.raises(LengthError) as caught:
        video_length("wjZofJX0v4M", client=client(handler))
    assert caught.value.code == "length-unavailable"
    rendered = "".join(traceback.format_exception(caught.value))
    assert KEY not in rendered


def test_the_price_follows_the_looked_up_length() -> None:
    """Two lengths in different tiers, so a lookup that ignored YouTube's answer would fail."""
    under_one_hour = client(lambda r: httpx.Response(200, content=answer(video("PT59M"))))
    two_and_a_half_hours = client(lambda r: httpx.Response(200, content=answer(video("PT2H30M"))))
    assert price_for("research", video_length("wjZofJX0v4M", client=under_one_hour)) == 2
    assert price_for("research", video_length("wjZofJX0v4M", client=two_and_a_half_hours)) == 2 + 2


@pytest.mark.parametrize(
    "video_id",
    ["wjZofJX0v4M,t0kACis_dJE", "wjZofJX0v4", "wjZofJX0v4MM", "wjZofJX0v4M\n", "wjZof JX0v4", "", None],
)
def test_anything_but_one_video_id_is_refused_without_a_call(video_id: object) -> None:
    """The API takes a list of ids and the first answer is priced, so a list could price the wrong video."""

    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("no call should be made")

    with pytest.raises(LengthError) as caught:
        video_length(video_id, client=client(handler))  # type: ignore[arg-type]
    assert caught.value.code == "video-not-found"


def test_an_answer_with_more_than_one_video_is_not_priced() -> None:
    with pytest.raises(LengthError) as caught:
        length_from(200, answer({"items": [video("PT59M")["items"][0], video("PT9H")["items"][0]]}))
    assert caught.value.code == "length-unavailable"
