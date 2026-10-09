"""
XtractNote — Content Generation Service

Framework-free generation: given a transcript's full text and a content type,
call the configured AI provider and return the generated content body.

Provider-abstracted via LangChain. The active provider (openai | anthropic) and
its model are read from settings, so swapping is an env change, not a code edit.
OpenAI is primary; Anthropic is kept as a ready secondary.

Uses the langchain-openai / langchain-anthropic wrappers already in
requirements — no raw provider SDKs — which also lines up with the LangGraph
engine this pipeline grows into later.

Mirrors transcript.py: a pure service layer with no FastAPI imports, raising
typed errors that carry a `.code` string for the API layer to map to HTTP.

Return shape — this service builds the storage-contract body, because the body
shape is domain logic, not transport:
  - prose types (summary, blog, notes, research, social):
        {"markdown": str}
  - flashcards:
        {"kind": "flashcards", "cards": [{"front": str, "back": str}, ...]}
  - quiz:
        {"kind": "quiz", "questions": [
            {"question": str, "options": [str, ...],
             "answerIndex": int, "explanation": str | None}, ...]}

The `kind` discriminant is attached HERE, by code, after validation — it is
never taken from model output, so the renderer's switch can trust it.

One generation per call, non-streaming. Long transcripts are guarded by a
character cap.
"""

import json
import math
import re
from typing import Any

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from app.config import settings
from app.services.prompts import (
    ContentType,
    SocialPlatform,
    STRUCTURED_CONTENT_TYPES,
    get_system_prompt,
)


# --- Guardrails ---------------------------------------------------------------

# At ~4 chars per token, 500k chars is ~125k tokens — large enough for
# multi-hour videos, but a backstop against pathological input running up cost.
# Real chunking/map-reduce arrives with the LangGraph upgrade.
MAX_TRANSCRIPT_CHARS = 500_000

# Cap on generated output length in tokens. A long blog post fits comfortably.
MAX_OUTPUT_TOKENS = 8_000

# How long the HTTP client waits on the provider, and how many times it retries.
# The clients' own defaults are no limit and two retries, so a provider that
# never answered would hold the call open indefinitely.
#
# The timeout applies to each phase of a request — connecting, sending, each
# wait for data — not to an attempt as a whole, and retries add backoff. So it
# makes a hung call end; it does not cap how long a call can take.
PROVIDER_TIMEOUT_SECONDS = 300
PROVIDER_MAX_RETRIES = 1

# Matches a leading ```json (or bare ```) fence and its closing fence. The
# structured prompts forbid fences, but models add them often enough that
# stripping is cheaper than failing a paid generation over formatting.
_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


# --- Typed error --------------------------------------------------------------

class GenerationError(Exception):
    """
    Raised when generation fails. `code` is a stable string the API layer maps
    to an HTTP status and response body — the same pattern as TranscriptError.
    """

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


# --- Public entry point -------------------------------------------------------

def generate_content(
    full_text: str,
    content_type: ContentType,
    platform: SocialPlatform | None = None,
) -> dict[str, Any]:
    """
    Generate content of `content_type` from a transcript's `full_text`.

    `platform` is required when content_type == "social" and ignored otherwise.

    Returns the content body dict (see module docstring for the three shapes).
    Raises GenerationError with a typed `.code`:
      - "empty-transcript"        : nothing to generate from
      - "transcript-too-long"     : exceeds MAX_TRANSCRIPT_CHARS
      - "unknown-content-type"    : content_type not recognized, or social
                                    requested without a valid platform
      - "provider-misconfigured"  : missing key / bad provider setting
      - "generation-failed"       : the provider call errored or returned nothing
      - "invalid-structured-output": the model's JSON was unparseable or the
                                    wrong shape (flashcards / quiz only)
    """
    text = (full_text or "").strip()
    if not text:
        raise GenerationError("empty-transcript", "The transcript is empty.")

    if len(text) > MAX_TRANSCRIPT_CHARS:
        raise GenerationError(
            "transcript-too-long",
            "This video's transcript is too long to process in one pass.",
        )

    # Validate the content type + platform (and fetch the prompt) before
    # spending a call. get_system_prompt raises ValueError for an unknown type,
    # a missing platform on social, or an unknown platform.
    try:
        system_prompt = get_system_prompt(content_type, platform)
    except ValueError as exc:
        raise GenerationError("unknown-content-type", str(exc))

    # Structured types get JSON mode where the provider supports it, and take a
    # different post-processing path below.
    wants_json = content_type in STRUCTURED_CONTENT_TYPES

    # Build the right chat model. Provider-specific config lives in the builders;
    # the invoke below is identical regardless of provider.
    provider = (settings.ai_provider or "openai").lower()
    if provider == "openai":
        llm = _build_openai(json_mode=wants_json)
    elif provider == "anthropic":
        llm = _build_anthropic()
    else:
        raise GenerationError(
            "provider-misconfigured",
            f"Unknown AI provider: {provider!r}. Set AI_PROVIDER to 'openai' or 'anthropic'.",
        )

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=text)]
    try:
        response = llm.invoke(messages)
    except Exception as exc:  # network / API / auth / SDK errors
        raise GenerationError("generation-failed", f"The {provider} request failed: {exc}")

    # For text chat models, response.content is a string. Guard anyway.
    raw = response.content
    content = raw.strip() if isinstance(raw, str) else ""
    if not content:
        raise GenerationError("generation-failed", "The model returned no content.")

    if content_type == "flashcards":
        return _build_flashcards_body(content)
    if content_type == "quiz":
        return _build_quiz_body(content)
    return {"markdown": content}


# --- Structured output handling -----------------------------------------------

def _parse_json_object(content: str) -> dict[str, Any]:
    """
    Parse the model's response into a JSON object.

    Strips a surrounding code fence first — the prompts forbid fences, but
    models add them anyway, and recovering is cheaper than discarding a paid
    generation. Raises GenerationError("invalid-structured-output") if the text
    is not parseable JSON or is not an object at the top level.
    """
    cleaned = _FENCE_RE.sub("", content).strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        raise GenerationError(
            "invalid-structured-output",
            "The model returned malformed data. Please try generating again.",
        )
    if not isinstance(parsed, dict):
        raise GenerationError(
            "invalid-structured-output",
            "The model returned data in an unexpected format. Please try again.",
        )
    return parsed


def _clean_str(value: Any) -> str:
    """Return a stripped string if `value` is a non-empty string, else ""."""
    return value.strip() if isinstance(value, str) else ""


def _clean_option(value: Any) -> str:
    """
    Normalise one quiz option to a string, or "" if it cannot become one.

    Unlike `_clean_str` this coerces numbers rather than discarding them. A quiz
    about quantities, years or percentages gets `[3, 5, 7, 9]` from the model —
    JSON numbers, because they are numbers — and discarding those left fewer
    than two usable options, which cost the whole question. Coercing keeps the
    question.

    **This does not guarantee the options array keeps its length**, and nothing
    should be built on the assumption that it does: the caller still drops empty
    strings, `None`, `bool` and anything non-scalar. Keeping `answerIndex`
    pointing at the right option comes from the positional translation in
    `_build_quiz_body`, not from here.

    `bool` is excluded even though it is an `int` subclass: `true` as an option
    is a malformed response, not the number 1.

    Non-finite floats are excluded too. `json.loads` accepts the non-standard
    `NaN`, `Infinity` and `-Infinity` and hands back Python floats, which would
    otherwise be offered to a reader as options reading "nan" and "inf".
    """
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, bool):
        return ""
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return str(value) if math.isfinite(value) else ""
    return ""


def _build_flashcards_body(content: str) -> dict[str, Any]:
    """
    Validate flashcard JSON and build the storage body.

    Expects {"cards": [{"front": str, "back": str}, ...]} from the model.
    Cards missing a front or back are dropped rather than failing the whole
    generation; we only error if nothing usable survives.
    """
    parsed = _parse_json_object(content)
    raw_cards = parsed.get("cards")
    if not isinstance(raw_cards, list):
        raise GenerationError(
            "invalid-structured-output",
            "The model did not return a list of flashcards. Please try again.",
        )

    cards: list[dict[str, str]] = []
    for item in raw_cards:
        if not isinstance(item, dict):
            continue
        front = _clean_str(item.get("front"))
        back = _clean_str(item.get("back"))
        if front and back:
            cards.append({"front": front, "back": back})

    if not cards:
        raise GenerationError(
            "invalid-structured-output",
            "The model returned no usable flashcards. Please try again.",
        )

    # `kind` is attached by us, not the model — the renderer can trust it.
    return {"kind": "flashcards", "cards": cards}


def _build_quiz_body(content: str) -> dict[str, Any]:
    """
    Validate quiz JSON and build the storage body.

    Expects {"questions": [{"question", "options", "answerIndex",
    "explanation"}, ...]}. Validation is strict where a bad value would mislead
    the reader and lenient elsewhere — an option count other than 4 still
    renders fine, so it is accepted. Unusable questions are dropped; we only
    error if none survive.

    **`answerIndex` is counted against the options the model sent**, so it is
    translated to this list's indexing rather than used directly. Dropping an
    option ahead of the answer would otherwise make a different option the
    correct one, which is worse than a crash: it renders perfectly and is
    wrong. If the answer's own option did not survive, the question is dropped
    rather than pointed somewhere else.
    """
    parsed = _parse_json_object(content)
    raw_questions = parsed.get("questions")
    if not isinstance(raw_questions, list):
        raise GenerationError(
            "invalid-structured-output",
            "The model did not return a list of quiz questions. Please try again.",
        )

    questions: list[dict[str, Any]] = []
    for item in raw_questions:
        if not isinstance(item, dict):
            continue

        question = _clean_str(item.get("question"))
        if not question:
            continue

        raw_options = item.get("options")
        if not isinstance(raw_options, list):
            continue

        # Keep the usable options AND the position each came from. `answerIndex`
        # counts against the ORIGINAL array, so dropping an option silently
        # moves every later one — an option removed ahead of the answer makes a
        # different option the "correct" one, with nothing to signal it.
        options: list[str] = []
        source_positions: list[int] = []
        for position, raw_option in enumerate(raw_options):
            option = _clean_option(raw_option)
            if option:
                options.append(option)
                source_positions.append(position)
        if len(options) < 2:  # need at least two for a choice
            continue

        # Reject the question when two cleaned options read the same. The reader
        # is shown identical choices and asked to pick between them, which is a
        # malformed question whichever of them is marked correct.
        #
        # A model repeating itself does this, and so does `["3", 3]`, since both
        # sides clean to "3".
        #
        # Rejected rather than de-duplicated: de-duplication changes which
        # options the question offers, and one that arrived malformed is not
        # worth reconstructing.
        if len(set(options)) != len(options):
            continue

        # Models occasionally emit answerIndex as a string ("2") despite the
        # prompt asking for an integer.
        raw_index = item.get("answerIndex")
        if isinstance(raw_index, bool):  # bool is an int subclass; reject it
            continue
        if isinstance(raw_index, int):
            answer_index = raw_index
        elif isinstance(raw_index, str) and raw_index.strip().isdigit():
            answer_index = int(raw_index.strip())
        else:
            continue

        # Translate the model's index into this list. Absence covers three cases
        # at once: the answer's own option was dropped, the index was out of
        # range, or it was negative. None of them leaves a correct answer to
        # mark, so the question goes rather than pointing at the wrong option.
        if answer_index not in source_positions:
            continue
        answer_index = source_positions.index(answer_index)

        explanation = _clean_str(item.get("explanation"))
        questions.append(
            {
                "question": question,
                "options": options,
                "answerIndex": answer_index,
                "explanation": explanation or None,
            }
        )

    if not questions:
        raise GenerationError(
            "invalid-structured-output",
            "The model returned no usable quiz questions. Please try again.",
        )

    # `kind` is attached by us, not the model — the renderer can trust it.
    return {"kind": "quiz", "questions": questions}


# --- Provider builders --------------------------------------------------------

def _build_openai(json_mode: bool = False) -> ChatOpenAI:
    """
    Build the OpenAI chat model (primary provider).

    When `json_mode` is set, the API is constrained to emit a valid JSON object,
    which all but eliminates parse failures for flashcards and quiz. OpenAI
    requires the word "JSON" to appear in the messages for this mode; the
    structured prompts satisfy that.
    """
    if not settings.openai_api_key:
        raise GenerationError("provider-misconfigured", "OPENAI_API_KEY is not set.")

    kwargs: dict[str, Any] = {
        "model": settings.openai_model,
        "api_key": settings.openai_api_key,
        "max_tokens": MAX_OUTPUT_TOKENS,
        "timeout": PROVIDER_TIMEOUT_SECONDS,
        "max_retries": PROVIDER_MAX_RETRIES,
    }
    if json_mode:
        kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}
    return ChatOpenAI(**kwargs)


def _build_anthropic() -> ChatAnthropic:
    """
    Build the Anthropic chat model (secondary provider).

    Anthropic has no direct equivalent of OpenAI's JSON mode, so structured
    output relies on the prompt plus the fence-stripping and validation in
    _parse_json_object.
    """
    if not settings.anthropic_api_key:
        raise GenerationError("provider-misconfigured", "ANTHROPIC_API_KEY is not set.")
    return ChatAnthropic(
        model=settings.anthropic_model,
        api_key=settings.anthropic_api_key,
        max_tokens=MAX_OUTPUT_TOKENS,
        timeout=PROVIDER_TIMEOUT_SECONDS,
        max_retries=PROVIDER_MAX_RETRIES,
    )