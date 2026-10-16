"""
XtractNote — What the generation graph carries

`GenerationState` is what flows from node to node: the request's choices in,
the transcript and the drafted body out. It holds no user and no job — those
belong to the worker that runs the graph — so nothing a node reads can name
either.

`NodeEffects` is what the nodes are allowed to do to the world. The worker
builds it from its own steps and hands it to each run through the graph's
config, so one compiled graph serves every run, and tests run the real graph
with stand-ins.

The state is never persisted: the graph is compiled without a checkpointer,
so a run's transcript and output exist in memory for that run and nowhere
else.
"""

from dataclasses import dataclass
from typing import Any, Callable, TypedDict

from langchain_core.runnables import RunnableConfig

from app.services.prompts import ContentType, SocialPlatform
from app.services.transcript_store import StoredTranscript

#: The key in a run's config under which its NodeEffects travel.
EFFECTS_KEY = "effects"


class GenerationState(TypedDict, total=False):
    """
    The graph's state. The first three are the input; each node adds its own.
    """

    video_id: str
    content_type: ContentType
    platform: SocialPlatform | None
    # Added by `fetch`.
    transcript: StoredTranscript
    # Added by `draft`: the content body, in the shape the draft row stores.
    body: dict[str, Any]


@dataclass(frozen=True)
class NodeEffects:
    """The effects the nodes perform, supplied per run."""

    obtain_transcript: Callable[[str], StoredTranscript]
    generate: Callable[[str, ContentType, SocialPlatform | None], dict[str, Any]]


def effects_of(config: RunnableConfig) -> NodeEffects:
    """
    This run's effects, from its config.

    Raises TypeError when a run was started without them, rather than letting
    a node fail later on a missing attribute.
    """
    effects = config.get("configurable", {}).get(EFFECTS_KEY)
    if not isinstance(effects, NodeEffects):
        raise TypeError("a generation run needs its NodeEffects in config")
    return effects


def run_config(effects: NodeEffects) -> RunnableConfig:
    """The config one run of the graph is started with."""
    return {"configurable": {EFFECTS_KEY: effects}}
