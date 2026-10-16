"""
The `analyse` node: an outline of the video — its thesis, its topics with the
sections that support each, its key terms — from one model call, checked
before it is used (`app.agents.outline`).
"""

from langchain_core.runnables import RunnableConfig

from app.agents.state import GenerationState, effects_of


def analyse(state: GenerationState, config: RunnableConfig) -> GenerationState:
    return {"outline": effects_of(config).analyse(state["sections"])}
