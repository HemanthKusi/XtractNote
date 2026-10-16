"""
The `fetch` node: the video's transcript.

Reuses a stored transcript while it is recent, and otherwise fetches and
stores one (`transcript_store.obtain`). A transcript that cannot be read
raises its TranscriptServiceError, whose code becomes the job's.
"""

from langchain_core.runnables import RunnableConfig

from app.agents.state import GenerationState, effects_of


def fetch(state: GenerationState, config: RunnableConfig) -> GenerationState:
    return {"transcript": effects_of(config).obtain_transcript(state["video_id"])}
