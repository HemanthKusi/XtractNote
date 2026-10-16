"""
The generation graph, run for real — LangGraph included — with stand-in effects.

These pin what the worker relies on from LangGraph as well as what the graph
itself does: a node's start event arrives before the node runs, a run closed
at that event never runs the node, and a node's own exception comes out with
its code. An upgrade that changed any of those would fail here rather than in
production.
"""

import threading
from typing import Any

import pytest

from app.agents.graph import GRAPH, NODE_STAGES, NODES, STAGE_ORDER, build_graph, stage_error
from app.agents.state import NodeEffects, run_config
from app.services.jobs import CREATION_STATUS, LEGAL_STATUSES, TERMINAL_STATUSES
from app.services.transcript import TranscriptUnavailableError
from app.services.transcript_store import StoredTranscript

TRANSCRIPT = StoredTranscript(id="transcript-1", full_text="The tide rises.", word_count=3)
BODY = {"markdown": "Tides follow the moon."}
INPUT = {"video_id": "dQw4w9WgXcQ", "content_type": "social", "platform": "linkedin"}


class Effects:
    """Stand-ins that record each call, in one log shared with the stream's events."""

    def __init__(self, log: list[str] | None = None, obtain_raises: Exception | None = None) -> None:
        self.log = log if log is not None else []
        self.obtain_raises = obtain_raises
        self.generated: list[tuple[Any, ...]] = []

    def obtain_transcript(self, video_id: str) -> StoredTranscript:
        self.log.append(f"obtain {video_id}")
        if self.obtain_raises:
            raise self.obtain_raises
        return TRANSCRIPT

    def generate(self, full_text: str, content_type: Any, platform: Any) -> dict[str, Any]:
        self.log.append("generate")
        self.generated.append((full_text, content_type, platform))
        return BODY

    def node_effects(self) -> NodeEffects:
        return NodeEffects(obtain_transcript=self.obtain_transcript, generate=self.generate)


def stream(effects: Effects, graph: Any = GRAPH):
    return graph.stream(INPUT, config=run_config(effects.node_effects()), stream_mode=["tasks", "values"])


# --- The nodes and their stages -----------------------------------------------


def test_the_running_stages_are_the_job_vocabulary_in_order() -> None:
    assert set(STAGE_ORDER) == LEGAL_STATUSES - TERMINAL_STATUSES - {CREATION_STATUS}
    assert STAGE_ORDER.index("fetching") < STAGE_ORDER.index("drafting")


def test_the_graph_fetches_then_drafts() -> None:
    assert [name for name, _, _ in NODES] == ["fetch", "draft"]
    assert NODE_STAGES == {"fetch": "fetching", "draft": "drafting"}


def test_every_node_the_graph_runs_has_a_stage() -> None:
    assert set(GRAPH.get_graph().nodes) - {"__start__", "__end__"} == set(NODE_STAGES)


def noop(state: Any, config: Any) -> Any:
    return {}


@pytest.mark.parametrize(
    ("nodes", "reason"),
    [
        ((), "at least one node"),
        ((("a", noop, "fetching"), ("a", noop, "drafting")), "unique"),
        ((("a", noop, "cooking"),), "not a running stage"),
        ((("a", noop, "pending"),), "not a running stage"),
        ((("a", noop, "completed"),), "not a running stage"),
        ((("a", noop, "failed"),), "not a running stage"),
        ((("a", noop, "drafting"), ("b", noop, "fetching")), "back to 'fetching'"),
    ],
)
def test_a_node_without_a_proper_stage_is_refused_when_the_graph_is_built(nodes, reason) -> None:
    assert reason in (stage_error(nodes) or "")
    with pytest.raises(ValueError):
        build_graph(nodes)


def test_two_nodes_may_share_a_stage() -> None:
    """Order may not go backwards, but staying is allowed."""
    assert stage_error((("a", noop, "drafting"), ("b", noop, "drafting"))) is None


# --- Running it ---------------------------------------------------------------


def test_a_run_ends_with_the_transcript_and_the_body() -> None:
    effects = Effects()
    final = [chunk for mode, chunk in stream(effects) if mode == "values"][-1]
    assert final["transcript"] is TRANSCRIPT
    assert final["body"] is BODY


def test_drafting_reads_the_fetched_transcript_and_the_requested_format() -> None:
    effects = Effects()
    list(stream(effects))
    assert effects.generated == [(TRANSCRIPT.full_text, "social", "linkedin")]


def test_each_node_announces_its_start_before_it_does_any_work() -> None:
    """What lets the worker enter a stage — and stop — before the node spends anything."""
    log: list[str] = []
    effects = Effects(log)
    for mode, chunk in stream(effects):
        if mode == "tasks" and "input" in chunk:
            log.append(f"start {chunk['name']}")
    assert log == ["start fetch", "obtain dQw4w9WgXcQ", "start draft", "generate"]


def test_the_start_event_carries_what_the_node_will_read() -> None:
    """The worker records the transcript as drafting begins, from this."""
    effects = Effects()
    starts = {chunk["name"]: chunk["input"] for mode, chunk in stream(effects) if mode == "tasks" and "input" in chunk}
    assert "transcript" not in starts["fetch"]
    assert starts["draft"]["transcript"] is TRANSCRIPT


def test_a_run_closed_at_a_nodes_start_never_runs_that_node() -> None:
    effects = Effects()
    run = stream(effects)
    for mode, chunk in run:
        if mode == "tasks" and chunk.get("name") == "draft" and "input" in chunk:
            run.close()
            break
    assert effects.generated == []


def test_a_nodes_own_error_comes_out_with_its_code() -> None:
    effects = Effects(obtain_raises=TranscriptUnavailableError("No captions."))
    with pytest.raises(TranscriptUnavailableError) as caught:
        list(stream(effects))
    assert caught.value.code == "no-captions"
    assert effects.generated == []


def test_a_run_without_its_effects_is_refused() -> None:
    with pytest.raises(TypeError):
        GRAPH.invoke(INPUT, config={"configurable": {}})


def test_one_compiled_graph_serves_runs_on_many_threads() -> None:
    """Every generation slot shares GRAPH; each run must see only its own effects."""
    results: dict[int, Any] = {}

    class Tagged(Effects):
        def __init__(self, tag: int) -> None:
            super().__init__()
            self.tag = tag

        def generate(self, full_text: str, content_type: Any, platform: Any) -> dict[str, Any]:
            return {"markdown": f"run {self.tag}"}

    def go(tag: int) -> None:
        final = GRAPH.invoke(INPUT, config=run_config(Tagged(tag).node_effects()))
        results[tag] = final["body"]["markdown"]

    threads = [threading.Thread(target=go, args=(tag,)) for tag in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert results == {tag: f"run {tag}" for tag in range(8)}
