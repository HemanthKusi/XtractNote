"""
XtractNote — The outline `analyse` produces

What a video covers: a thesis, its register (technical or general), the topics
in order — each with its key points, the sections that support it, and the
technical items it contains — and the key terms. `draft` writes from it,
and it is stored on the draft row as the provenance per-section features point
into.

**It comes from a model reading untrusted text, so it is checked before it is
used** (`outline_from`): every field must be the right type and within its
bounds, and every section a topic cites must exist. One that fails is refused
whole with "analysis-failed", never trimmed into something half-valid.
"""

from dataclasses import dataclass
from typing import Any, Sequence

from app.agents.sections import Section
from app.services.generate import GenerationError

ANALYSIS_FAILED = "analysis-failed"

# Bounds generous enough for a long video, and tight enough that a runaway
# answer cannot balloon the drafting prompt.
MAX_THESIS = 500
MAX_TOPICS = 15
MAX_HEADING = 160
MAX_POINTS = 10
MAX_POINT = 400
MAX_KEY_TERMS = 20
MAX_TERM = 80
MAX_DEFINITION = 400
#: How many section numbers one topic may list, repeats included. Repeats are
#: harmless and removed; the cap only bounds the work of checking them.
MAX_CITATIONS = 1_000

REGISTERS = ("technical", "general")

#: What a technical item can be, each with its own content.
ITEM_KINDS = ("formula", "quantity", "table", "procedure", "example")
MAX_ITEMS = 8
MAX_TITLE = 160
MAX_LATEX = 400
MAX_VALUE = 160
MAX_COLUMNS = 6
MAX_ROWS = 12
MAX_CELL = 160
MAX_STEPS = 12
MAX_STEP = 400


@dataclass(frozen=True)
class TechnicalItem:
    """
    One piece of technical material a topic contains, as the video states it.

    `kind` decides which content field is set: `latex` for a formula, `value`
    for a quantity, `columns` and `rows` for a table, `steps` for a procedure
    or a worked example. `title` says what the item is.
    """

    kind: str
    title: str
    sections: tuple[int, ...]
    latex: str = ""
    value: str = ""
    columns: tuple[str, ...] = ()
    rows: tuple[tuple[str, ...], ...] = ()
    steps: tuple[str, ...] = ()


@dataclass(frozen=True)
class Topic:
    heading: str
    points: tuple[str, ...]
    sections: tuple[int, ...]
    items: tuple[TechnicalItem, ...] = ()


@dataclass(frozen=True)
class KeyTerm:
    term: str
    definition: str


@dataclass(frozen=True)
class Outline:
    thesis: str
    topics: tuple[Topic, ...]
    key_terms: tuple[KeyTerm, ...]
    register: str = "general"
    # Sections no topic cites. Kept as they are rather than attached to a
    # topic, which would claim support the analysis never gave; drafting is
    # told to cover them anyway.
    uncovered: tuple[int, ...] = ()


def _refuse(reason: str) -> GenerationError:
    return GenerationError(ANALYSIS_FAILED, f"The analysis was unusable: {reason}.")


def _text(value: Any, field: str, limit: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise _refuse(f"{field} is missing")
    text = value.strip()
    if len(text) > limit:
        raise _refuse(f"{field} is longer than {limit} characters")
    return text


def _list(value: Any, field: str, low: int, high: int) -> list[Any]:
    if not isinstance(value, list):
        raise _refuse(f"{field} is not a list")
    if not low <= len(value) <= high:
        raise _refuse(f"{field} has {len(value)} entries, not {low} to {high}")
    return value


def _sections(value: Any, field: str, section_count: int) -> tuple[int, ...]:
    cited = _list(value, field, 1, MAX_CITATIONS)
    if not all(isinstance(i, int) and not isinstance(i, bool) for i in cited):
        raise _refuse(f"{field} lists a section that is not a number")
    if not all(0 <= i < section_count for i in cited):
        raise _refuse(f"{field} lists a section that does not exist")
    return tuple(sorted(set(cited)))


def _item(raw: Any, field: str, section_count: int) -> TechnicalItem:
    if not isinstance(raw, dict):
        raise _refuse(f"{field} is not an object")
    kind = raw.get("kind")
    if kind not in ITEM_KINDS:
        raise _refuse(f"{field} has an unknown kind")
    title = _text(raw.get("title"), f"{field}'s title", MAX_TITLE)
    sections = _sections(raw.get("sections"), f"{field}'s sections", section_count)
    if kind == "formula":
        latex = _text(raw.get("latex"), f"{field}'s LaTeX", MAX_LATEX)
        # Written between $$ and $$ by the drafting step: a dollar sign or a
        # blank line inside would end the equation early.
        if "$" in latex or "\n\n" in latex:
            raise _refuse(f"{field}'s LaTeX contains a dollar sign or a blank line")
        return TechnicalItem(kind=kind, title=title, sections=sections, latex=latex)
    if kind == "quantity":
        return TechnicalItem(
            kind=kind, title=title, sections=sections,
            value=_text(raw.get("value"), f"{field}'s value", MAX_VALUE),
        )
    if kind == "table":
        columns = tuple(
            _text(c, f"a column of {field}", MAX_CELL)
            for c in _list(raw.get("columns"), f"{field}'s columns", 2, MAX_COLUMNS)
        )
        rows = []
        for row in _list(raw.get("rows"), f"{field}'s rows", 1, MAX_ROWS):
            cells = _list(row, f"a row of {field}", len(columns), len(columns))
            rows.append(tuple(_text(c, f"a cell of {field}", MAX_CELL) for c in cells))
        return TechnicalItem(kind=kind, title=title, sections=sections, columns=columns, rows=tuple(rows))
    steps = tuple(
        _text(step, f"a step of {field}", MAX_STEP)
        for step in _list(raw.get("steps"), f"{field}'s steps", 1, MAX_STEPS)
    )
    return TechnicalItem(kind=kind, title=title, sections=sections, steps=steps)


def outline_from(parsed: dict[str, Any], section_count: int) -> Outline:
    """
    The outline in `parsed`, checked against `section_count` sections.

    Raises GenerationError("analysis-failed") on anything out of shape or
    bounds, or a section that does not exist.
    """
    thesis = _text(parsed.get("thesis"), "the thesis", MAX_THESIS)
    register = parsed.get("register")
    if register not in REGISTERS:
        raise _refuse("the register is not technical or general")
    topics = []
    for number, raw in enumerate(_list(parsed.get("topics"), "topics", 1, MAX_TOPICS), start=1):
        if not isinstance(raw, dict):
            raise _refuse(f"topic {number} is not an object")
        heading = _text(raw.get("heading"), f"topic {number}'s heading", MAX_HEADING)
        points = tuple(
            _text(point, f"a point of topic {number}", MAX_POINT)
            for point in _list(raw.get("points"), f"topic {number}'s points", 1, MAX_POINTS)
        )
        sections = _sections(raw.get("sections"), f"topic {number}'s sections", section_count)
        items = tuple(
            _item(item, f"item {i} of topic {number}", section_count)
            for i, item in enumerate(_list(raw.get("items", []), f"topic {number}'s items", 0, MAX_ITEMS), start=1)
        )
        topics.append(Topic(heading=heading, points=points, sections=sections, items=items))
    key_terms = []
    for number, raw in enumerate(_list(parsed.get("key_terms", []), "key terms", 0, MAX_KEY_TERMS), start=1):
        if not isinstance(raw, dict):
            raise _refuse(f"key term {number} is not an object")
        key_terms.append(
            KeyTerm(
                term=_text(raw.get("term"), f"key term {number}", MAX_TERM),
                definition=_text(raw.get("definition"), f"key term {number}'s definition", MAX_DEFINITION),
            )
        )
    cited = {i for topic in topics for i in topic.sections}
    uncovered = tuple(i for i in range(section_count) if i not in cited)
    return Outline(
        thesis=thesis,
        topics=tuple(topics),
        key_terms=tuple(key_terms),
        register=register,
        uncovered=uncovered,
    )


def outline_metadata(outline: Outline, sections: Sequence[Section]) -> dict[str, Any]:
    """
    The outline as it is stored on the draft row: each topic's sections with
    their times, so a reader needs nothing else to point into the video.
    """
    by_index = {section.index: section for section in sections}

    def timed(indices: tuple[int, ...]) -> list[dict[str, Any]]:
        return [{"index": i, "start": by_index[i].start, "end": by_index[i].end} for i in indices]

    def item(it: TechnicalItem) -> dict[str, Any]:
        stored: dict[str, Any] = {"kind": it.kind, "title": it.title, "sections": timed(it.sections)}
        if it.kind == "formula":
            stored["latex"] = it.latex
        elif it.kind == "quantity":
            stored["value"] = it.value
        elif it.kind == "table":
            stored["columns"] = list(it.columns)
            stored["rows"] = [list(row) for row in it.rows]
        else:
            stored["steps"] = list(it.steps)
        return stored

    return {
        "thesis": outline.thesis,
        "register": outline.register,
        "topics": [
            {
                "heading": topic.heading,
                "points": list(topic.points),
                "sections": timed(topic.sections),
                "items": [item(it) for it in topic.items],
            }
            for topic in outline.topics
        ],
        "key_terms": [{"term": t.term, "definition": t.definition} for t in outline.key_terms],
        "uncovered": timed(outline.uncovered),
    }
