"""
The `draft` node: the content, written from the transcript.

Today this is the same single generation call that ran before the graph
(`generate_content`), with the same output. A failure raises GenerationError,
whose code becomes the job's.
"""

from langchain_core.runnables import RunnableConfig

from app.agents.state import GenerationState, effects_of


def draft(state: GenerationState, config: RunnableConfig) -> GenerationState:
    body = effects_of(config).generate(
        state["transcript"].full_text,
        state["content_type"],
        state.get("platform"),
    )
    return {"body": body}
