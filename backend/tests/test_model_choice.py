"""
Which model each call uses, how much it may write, and that a reply cut off at
that limit is refused.

No network: the client builders are replaced, so these check what `complete`
asks for and what it does with the reply.
"""

from typing import Any

import pytest
from langchain_core.messages import AIMessage

from app.config import Settings, settings
from app.services import generate
from app.services.generate import (
    DEPTH_OUTPUT_TOKENS,
    MAX_OUTPUT_TOKENS,
    GenerationError,
    complete,
    generate_content,
)
from app.services.prompts import DEPTH_CONTENT_TYPES

MAIN, DEPTH, ANALYSIS = "main-model", "depth-model", "analysis-model"


class FakeClient:
    def __init__(self, reply: AIMessage) -> None:
        self.reply = reply

    def invoke(self, messages: Any) -> AIMessage:
        return self.reply


def building(
    monkeypatch: pytest.MonkeyPatch,
    provider: str = "openai",
    reply: AIMessage | None = None,
) -> list[dict[str, Any]]:
    """Replace the builders; returns what each build was asked for."""
    built: list[dict[str, Any]] = []
    answer = reply or AIMessage(content="Done.", response_metadata={"finish_reason": "stop"})

    def build(**kwargs: Any) -> FakeClient:
        built.append(kwargs)
        return FakeClient(answer)

    monkeypatch.setattr(settings, "ai_provider", provider)
    for prefix in ("openai", "anthropic"):
        monkeypatch.setattr(settings, f"{prefix}_model", MAIN)
        monkeypatch.setattr(settings, f"{prefix}_depth_model", DEPTH)
        monkeypatch.setattr(settings, f"{prefix}_analysis_model", ANALYSIS)
    monkeypatch.setattr(generate, "_build_openai", build)
    monkeypatch.setattr(generate, "_build_anthropic", build)
    return built


# --- The model and the cap ----------------------------------------------------


@pytest.mark.parametrize("provider", ["openai", "anthropic"])
@pytest.mark.parametrize(
    ("purpose", "model", "cap"),
    [("draft", MAIN, MAX_OUTPUT_TOKENS), ("depth", DEPTH, DEPTH_OUTPUT_TOKENS), ("analysis", ANALYSIS, MAX_OUTPUT_TOKENS)],
)
def test_each_purpose_gets_its_model_and_cap(
    monkeypatch: pytest.MonkeyPatch, provider: str, purpose: str, model: str, cap: int
) -> None:
    built = building(monkeypatch, provider)
    complete("system", "user", json_mode=False, purpose=purpose)  # type: ignore[arg-type]
    (call,) = built
    assert (call["model"], call["max_tokens"]) == (model, cap)


@pytest.mark.parametrize("provider", ["openai", "anthropic"])
def test_an_empty_depth_setting_falls_back_to_the_main_model(
    monkeypatch: pytest.MonkeyPatch, provider: str
) -> None:
    built = building(monkeypatch, provider)
    monkeypatch.setattr(settings, f"{provider}_depth_model", "")
    complete("system", "user", json_mode=False, purpose="depth")
    assert built[0]["model"] == MAIN and built[0]["max_tokens"] == DEPTH_OUTPUT_TOKENS


def test_the_depth_model_defaults_to_the_one_tested() -> None:
    assert Settings.model_fields["openai_depth_model"].default == "gpt-5.4"


# --- Which formats go deep ----------------------------------------------------


class Stop(Exception):
    pass


@pytest.mark.parametrize(
    "content_type", ["summary", "blog", "notes", "research", "flashcards", "quiz", "social"]
)
def test_only_notes_and_research_are_drafted_with_the_depth_model(
    monkeypatch: pytest.MonkeyPatch, content_type: str
) -> None:
    asked: list[str] = []

    def fake_complete(system: str, user: str, *, json_mode: bool, purpose: str = "draft") -> str:
        asked.append(purpose)
        raise Stop

    monkeypatch.setattr(generate, "complete", fake_complete)
    platform = "linkedin" if content_type == "social" else None
    with pytest.raises(Stop):
        generate_content("The tide rises.", content_type, platform)  # type: ignore[arg-type]
    expected = "depth" if content_type in DEPTH_CONTENT_TYPES else "draft"
    assert asked == [expected]


# --- A reply cut off at the cap -----------------------------------------------


@pytest.mark.parametrize(
    ("provider", "metadata"),
    [("openai", {"finish_reason": "length"}), ("anthropic", {"stop_reason": "max_tokens"})],
)
def test_a_reply_cut_off_at_the_cap_is_refused(
    monkeypatch: pytest.MonkeyPatch, provider: str, metadata: dict[str, str]
) -> None:
    building(monkeypatch, provider, AIMessage(content="# Half a brief", response_metadata=metadata))
    with pytest.raises(GenerationError) as caught:
        complete("system", "user", json_mode=False, purpose="depth")
    assert caught.value.code == "generation-failed"
    assert str(DEPTH_OUTPUT_TOKENS) in caught.value.message


@pytest.mark.parametrize(
    ("provider", "metadata"),
    [("openai", {"finish_reason": "stop"}), ("anthropic", {"stop_reason": "end_turn"}), ("openai", {})],
)
def test_a_finished_reply_is_returned(
    monkeypatch: pytest.MonkeyPatch, provider: str, metadata: dict[str, str]
) -> None:
    building(monkeypatch, provider, AIMessage(content="  # A whole brief  ", response_metadata=metadata))
    assert complete("system", "user", json_mode=False) == "# A whole brief"
