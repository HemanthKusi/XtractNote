"""
The `segment` node: the transcript grouped into numbered, timed sections
(`app.agents.sections`). No model call.

It also refuses, before anything is paid for, a transcript whose sections
would not fit the prompts — "transcript-too-long" — since `analyse` and
`draft` both send every section. The sections are measured in tokens, because
characters per token varies several-fold between languages: a limit in
characters let a dense transcript through to fail at the model instead.
"""

from functools import lru_cache

import tiktoken
from langchain_core.runnables import RunnableConfig

from app.agents.prompts.data import sections_block
from app.agents.sections import Section, sections_of
from app.agents.state import GenerationState
from app.services.generate import GenerationError

#: The most tokens the sections may take in a prompt. The analysis model's
#: 128k-token context is the smallest the pipeline uses; this leaves room in it
#: for the system prompt and the answer.
MAX_SECTIONS_TOKENS = 100_000

#: gpt-4o's tokenizer. For any other model the count is an estimate.
ENCODING = "o200k_base"


@lru_cache(maxsize=1)
def _encoding() -> tiktoken.Encoding:
    # Loaded on first use, not at import: the first load on a new machine
    # downloads the token table.
    return tiktoken.get_encoding(ENCODING)


def section_tokens(sections: list[Section]) -> int:
    """How many tokens the sections take as `analyse` and `draft` send them."""
    return len(_encoding().encode(sections_block(sections)))


def segment(state: GenerationState, config: RunnableConfig) -> GenerationState:
    sections = sections_of(state["transcript"].segments)
    if not sections:
        raise GenerationError("empty-transcript", "The transcript has no captions.")
    if section_tokens(sections) > MAX_SECTIONS_TOKENS:
        raise GenerationError(
            "transcript-too-long",
            "This video's transcript is too long to process in one pass.",
        )
    return {"sections": sections}
