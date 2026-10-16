"""
XtractNote — The generation graph

A generation is a chain of nodes, each doing one real piece of work, and each
belonging to one stage of the job: a node starting is what moves the job to
its stage. `NODES` is the only place that pairing is written.

The chain: `fetch` the transcript, `segment` it into timed sections,
`analyse` them into an outline, `draft` the content from the outline. Each
node arrives with the work that justifies it — none is added so a stage name
has something to report.

The graph is compiled once (`GRAPH`) and shared by every run; a run's effects
travel in its config (`app.agents.state.run_config`), so nothing about one run
lives in the compiled graph.
"""

from typing import Callable

from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.agents.nodes.analyse import analyse
from app.agents.nodes.draft import draft
from app.agents.nodes.fetch import fetch
from app.agents.nodes.segment import segment
from app.agents.state import GenerationState

Node = Callable[[GenerationState, RunnableConfig], GenerationState]

#: The stages a running job passes through, in order. A test checks it is the
#: job vocabulary without its creation and terminal states.
STAGE_ORDER: tuple[str, ...] = ("fetching", "reading", "understanding", "drafting", "polishing")

#: The nodes, in the order they run, each with the stage it belongs to.
NODES: tuple[tuple[str, Node, str], ...] = (
    ("fetch", fetch, "fetching"),
    ("segment", segment, "reading"),
    ("analyse", analyse, "understanding"),
    ("draft", draft, "drafting"),
)


def stage_error(nodes: tuple[tuple[str, Node, str], ...]) -> str | None:
    """
    Why `nodes` cannot be built into the graph, or None if it can.

    Every node needs a stage in STAGE_ORDER, names must be unique, and stages
    may not run backwards — a job moving from drafting back to fetching would
    describe work it is not doing.
    """
    if not nodes:
        return "a generation graph needs at least one node"
    names = [name for name, _, _ in nodes]
    if len(set(names)) != len(names):
        return "node names must be unique"
    previous = -1
    for name, _, stage in nodes:
        if stage not in STAGE_ORDER:
            return f"node {name!r} has {stage!r}, which is not a running stage"
        position = STAGE_ORDER.index(stage)
        if position < previous:
            return f"node {name!r} moves the job back to {stage!r}"
        previous = position
    return None


def build_graph(
    nodes: tuple[tuple[str, Node, str], ...] = NODES,
) -> CompiledStateGraph:
    """
    The nodes chained in order and compiled, without a checkpointer.

    Raises ValueError when `stage_error` finds a problem, so a node without a
    proper stage fails when the graph is built — at import — not mid-run.
    """
    if (reason := stage_error(nodes)) is not None:
        raise ValueError(reason)
    graph = StateGraph(GenerationState)
    for name, node, _ in nodes:
        graph.add_node(name, node)
    graph.add_edge(START, nodes[0][0])
    for (before, _, _), (after, _, _) in zip(nodes, nodes[1:]):
        graph.add_edge(before, after)
    graph.add_edge(nodes[-1][0], END)
    return graph.compile()


def stages_of(nodes: tuple[tuple[str, Node, str], ...] = NODES) -> dict[str, str]:
    """Each node's stage, by node name."""
    return {name: stage for name, _, stage in nodes}


GRAPH = build_graph()
NODE_STAGES = stages_of()
