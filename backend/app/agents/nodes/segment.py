"""
The `segment` node: the transcript grouped into numbered, timed sections
(`app.agents.sections`). No model call.

It also refuses, before anything is paid for, a transcript whose sections
would not fit the drafting prompt — "transcript-too-long" — since `analyse`
and `draft` both send every section.
"""

from langchain_core.runnables import RunnableConfig

from app.agents.prompts.data import sections_block
from app.agents.sections import sections_of
from app.agents.state import GenerationState
from app.services.generate import GenerationError

#: The most characters the sections may take in a prompt. A character count
#: stands in for tokens — roughly four to a token — leaving room within a
#: 128k-token context for the system prompt, the outline and the answer.
MAX_SECTIONS_CHARS = 380_000


def segment(state: GenerationState, config: RunnableConfig) -> GenerationState:
    sections = sections_of(state["transcript"].segments)
    if not sections:
        raise GenerationError("empty-transcript", "The transcript has no captions.")
    if len(sections_block(sections)) > MAX_SECTIONS_CHARS:
        raise GenerationError(
            "transcript-too-long",
            "This video's transcript is too long to process in one pass.",
        )
    return {"sections": sections}
