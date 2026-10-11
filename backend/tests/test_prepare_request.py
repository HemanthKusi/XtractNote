"""
`prepare_request`: the checks a generation request passes before anything is
spent on it.

The endpoint runs these before creating a job, and `generate_content` runs them
before its model call, so both refuse the same input with the same code. No
network, no model call.
"""

from typing import get_args

import pytest

from app.config import settings
from app.services.generate import (
    MAX_TRANSCRIPT_CHARS,
    GenerationError,
    PreparedRequest,
    generate_content,
    prepare_request,
)
from app.services.prompts import ContentType, SocialPlatform

NON_SOCIAL: list[ContentType] = [t for t in get_args(ContentType) if t != "social"]


def code_for(*args: object) -> str:
    """Call prepare_request with deliberately bad input, and return the code it refuses with."""
    with pytest.raises(GenerationError) as caught:
        prepare_request(*args)
    return caught.value.code


# --- Accepted -----------------------------------------------------------------


@pytest.mark.parametrize("content_type", NON_SOCIAL)
def test_every_non_social_type_is_accepted(content_type: ContentType) -> None:
    prepared = prepare_request("A transcript.", content_type)
    assert isinstance(prepared, PreparedRequest)
    assert prepared.system_prompt


@pytest.mark.parametrize("platform", get_args(SocialPlatform))
def test_social_is_accepted_for_every_platform(platform: SocialPlatform) -> None:
    assert prepare_request("A transcript.", "social", platform).system_prompt


def test_the_text_sent_is_trimmed() -> None:
    assert prepare_request("  \n A transcript. \t", "summary").text == "A transcript."


def test_a_transcript_exactly_at_the_limit_is_accepted() -> None:
    assert len(prepare_request("x" * MAX_TRANSCRIPT_CHARS, "summary").text) == MAX_TRANSCRIPT_CHARS


def test_the_limit_is_measured_after_trimming() -> None:
    padded = "  " + "x" * MAX_TRANSCRIPT_CHARS + "  "
    assert prepare_request(padded, "summary").text == "x" * MAX_TRANSCRIPT_CHARS


# --- Refused, with a code -----------------------------------------------------


@pytest.mark.parametrize("text", ["", "   ", "\n\t "])
def test_an_empty_transcript_is_refused(text: str) -> None:
    assert code_for(text, "summary") == "empty-transcript"


def test_a_missing_transcript_is_refused() -> None:
    assert code_for(None, "summary") == "empty-transcript"


def test_a_transcript_over_the_limit_is_refused() -> None:
    assert code_for("x" * (MAX_TRANSCRIPT_CHARS + 1), "summary") == "transcript-too-long"


def test_an_unknown_type_is_refused() -> None:
    assert code_for("A transcript.", "poem") == "unknown-content-type"


def test_social_without_a_platform_is_refused() -> None:
    assert code_for("A transcript.", "social", None) == "unknown-content-type"


def test_social_with_an_unknown_platform_is_refused() -> None:
    assert code_for("A transcript.", "social", "myspace") == "unknown-content-type"


def test_an_empty_transcript_is_reported_before_a_bad_type() -> None:
    """The order is part of the contract: the screen shows one reason."""
    assert code_for("", "poem") == "empty-transcript"


# --- generate_content refuses the same input, before any provider ------------


@pytest.mark.parametrize(
    ("args", "code"),
    [
        (("", "summary"), "empty-transcript"),
        (("x" * (MAX_TRANSCRIPT_CHARS + 1), "summary"), "transcript-too-long"),
        (("A transcript.", "social", None), "unknown-content-type"),
    ],
)
def test_generate_content_refuses_before_choosing_a_provider(
    monkeypatch: pytest.MonkeyPatch, args: tuple, code: str
) -> None:
    """
    With the provider set to something invalid, reaching the provider step would
    raise `provider-misconfigured`. Getting the input's own code instead proves
    the checks ran first.
    """
    monkeypatch.setattr(settings, "ai_provider", "not-a-provider")
    with pytest.raises(GenerationError) as caught:
        generate_content(*args)
    assert caught.value.code == code
