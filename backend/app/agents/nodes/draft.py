"""
The `draft` node: the content, written from the outline and the sections.

The format's own prompt, plus guidance to follow the outline, to present its
material as the format and the outline's register allow, and to treat all of
the material as data (`app.agents.prompts.draft`). The output shape is the
format's, unchanged. A failure raises GenerationError, whose code becomes the
job's.
"""

from langchain_core.runnables import RunnableConfig

from app.agents.prompts.draft import draft_material, guidance_for
from app.agents.state import GenerationState, effects_of


def draft(state: GenerationState, config: RunnableConfig) -> GenerationState:
    body = effects_of(config).generate(
        draft_material(state["outline"], state["sections"]),
        state["content_type"],
        state.get("platform"),
        guidance_for(state["content_type"], state["outline"].register),
    )
    return {"body": body}
