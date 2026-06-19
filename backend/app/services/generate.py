"""
XtractNote — Content Generation Service

Framework-free generation: given a transcript's full text and a content type,
call the configured AI provider and return the generated Markdown.

Provider-abstracted via LangChain. The active provider (openai | anthropic) and
its model are read from settings, so swapping is an env change, not a code edit.
OpenAI is primary; Anthropic is kept as a ready secondary.

Uses the langchain-openai / langchain-anthropic wrappers already in
requirements — no raw provider SDKs — which also lines up with the LangGraph
engine this pipeline grows into later.

Mirrors transcript.py: a pure service layer with no FastAPI imports, raising
typed errors that carry a `.code` string for the API layer to map to HTTP.

MVP: summary, blog, notes (see prompts.py). One generation per call,
non-streaming. Long transcripts are guarded by a character cap.
"""

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from app.config import settings
from app.services.prompts import ContentType, get_system_prompt


# --- Guardrails ---------------------------------------------------------------

# At ~4 chars per token, 500k chars is ~125k tokens — large enough for
# multi-hour videos, but a backstop against pathological input running up cost.
# Real chunking/map-reduce arrives with the LangGraph upgrade.
MAX_TRANSCRIPT_CHARS = 500_000

# Cap on generated output length in tokens. A long blog post fits comfortably.
MAX_OUTPUT_TOKENS = 8_000


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

def generate_content(full_text: str, content_type: ContentType) -> str:
    """
    Generate content of `content_type` from a transcript's `full_text`.

    Returns the generated Markdown. Raises GenerationError with a typed `.code`:
      - "empty-transcript"      : nothing to generate from
      - "transcript-too-long"   : exceeds MAX_TRANSCRIPT_CHARS
      - "unknown-content-type"  : content_type not recognized
      - "provider-misconfigured": missing key / bad provider setting
      - "generation-failed"     : the provider call errored or returned nothing
    """
    text = (full_text or "").strip()
    if not text:
        raise GenerationError("empty-transcript", "The transcript is empty.")

    if len(text) > MAX_TRANSCRIPT_CHARS:
        raise GenerationError(
            "transcript-too-long",
            "This video's transcript is too long to process in one pass.",
        )

    # Validate the content type (and fetch its prompt) before spending a call.
    try:
        system_prompt = get_system_prompt(content_type)
    except ValueError:
        raise GenerationError(
            "unknown-content-type",
            f"Unsupported content type: {content_type!r}.",
        )

    # Build the right chat model. Provider-specific config lives in the builders;
    # the invoke below is identical regardless of provider.
    provider = (settings.ai_provider or "openai").lower()
    if provider == "openai":
        llm = _build_openai()
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
    return content


# --- Provider builders --------------------------------------------------------

def _build_openai() -> ChatOpenAI:
    """Build the OpenAI chat model (primary provider)."""
    if not settings.openai_api_key:
        raise GenerationError("provider-misconfigured", "OPENAI_API_KEY is not set.")
    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        max_tokens=MAX_OUTPUT_TOKENS,
    )


def _build_anthropic() -> ChatAnthropic:
    """Build the Anthropic chat model (secondary provider)."""
    if not settings.anthropic_api_key:
        raise GenerationError("provider-misconfigured", "ANTHROPIC_API_KEY is not set.")
    return ChatAnthropic(
        model=settings.anthropic_model,
        api_key=settings.anthropic_api_key,
        max_tokens=MAX_OUTPUT_TOKENS,
    )