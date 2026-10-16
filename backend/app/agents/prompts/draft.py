"""
What `draft` adds to a format's own prompt, and the material it sends: the
outline `analyse` produced and the sections it was made from.

How material is presented depends on the format, and for notes and research on
the outline's register too. Notes and research set a technical video's material
out with equations and, for research, derivations; a general video gets tables
and definitions but no equations, and is never shown the maths instructions.
Summary and blog include technical material where it is central; formats whose
destination shows plain text keep formulas in words.
"""

from typing import Sequence

from app.agents.outline import Outline, TechnicalItem
from app.agents.prompts.data import DATA_RULE, neutralise, neutralise_latex, sections_block
from app.agents.sections import Section
from app.services.prompts import BEYOND_THE_VIDEO, ContentType

FOLLOW_THE_OUTLINE = (
    "You are given an outline of the video inside <outline>, and its transcript "
    "as numbered, timed sections inside <sections>. Follow the outline's topics "
    "in its order, and cover what each topic's sections say. The sections are "
    "the source: where the outline and the sections differ, the sections are "
    "right. The numbering, the times and the outline are for you, not the reader: "
    "never mention a section, a section number, a timestamp or the outline in "
    "what you write."
)

MATHS_NOTATION = (
    "Write maths only between double dollar signs: a displayed equation as $$ on "
    "its own line, the LaTeX, and $$ on its own line; a symbol or short expression "
    "inside a sentence as $$…$$. Never use a single $ for maths — a single $ is a "
    "currency sign."
)

DEFINITION_LINE = (
    "Each key term, where it is first used, as a definition on its own line: "
    "**Term** — what it means."
)

TECHNICAL_STRUCTURE = (
    "Present technical material as structure, where it belongs in the text:\n"
    "- A formula as a displayed equation, followed by a line saying what its "
    "symbols mean.\n"
    "- A table as a Markdown table.\n"
    "- A quantity in the sentence that uses it, or in a table when several are "
    "compared.\n"
    "- A procedure or a worked example as a numbered list of steps.\n"
    f"- {DEFINITION_LINE}\n"
    "The outline's items are where to start, not a limit: set out every formula, "
    "figure, comparison, procedure and example the sections contain, including "
    "ones the outline missed.\n"
    f"{MATHS_NOTATION}"
)

GENERAL_STRUCTURE = (
    "Present the material as structure, where it belongs in the text:\n"
    "- A Markdown table where the video gives figures or recommendations worth "
    "comparing side by side.\n"
    "- A procedure the video describes as a numbered list of steps.\n"
    f"- {DEFINITION_LINE}\n"
    "Otherwise write prose and lists. Write no equations and no LaTeX: a value, "
    "a unit conversion or a chain of causes goes in a sentence or a table."
)

# The research brief's shape on a technical video, shown rather than described:
# models followed the rules for derivations loosely until they had an example to
# copy. The topic is deliberately unrelated to anything the product has been
# tested on, and the guidance says to take its form and never its content.
RESEARCH_EXAMPLE = rf"""# A pendulum's period is set by its length, not its mass

*For small swings, length and gravity alone fix the period, which is why a pendulum clock is regulated by moving its bob.*

## The mass cancels out of the motion

The speaker models the bob as a point mass $$m$$ on a light rod of length $$L$$, released at a small angle $$\theta$$.

$$
F = -mg\sin\theta
$$

The part of gravity along the arc pulls the bob back toward the bottom.

$$
F \approx -mg\theta
$$

For small angles $$\sin\theta \approx \theta$$, which the speaker says holds below about 15°.

$$
T = 2\pi\sqrt{{\frac{{L}}{{g}}}}
$$

The equation of motion is now simple harmonic; $$m$$ appears on both sides and cancels.

## The lengths the speaker quotes

| Length $$L$$ | Period $$T$$ | Arithmetic |
|---|---|---|
| 0.25 m | 1.00 s | $$2\pi\sqrt{{0.25/9.81}}$$ |
| 0.994 m | 2.00 s | $$2\pi\sqrt{{0.994/9.81}}$$ |

> {BEYOND_THE_VIDEO} The small-angle step has a known error. To second order, $$T \approx 2\pi\sqrt{{L/g}}\,(1 + \theta_0^2/16)$$, so a 10° swing runs about 0.2% slow.

## Limits of the argument

1. The rod is assumed massless; a real rod moves the effective length toward the pivot.
2. Friction is dropped, though the speaker notes a real clock must replace the energy it loses.

## Sources

- Huygens's treatise on pendulum clocks, as the speaker names it."""

TECHNICAL_RESEARCH = (
    "This video is technical, so the brief also derives:\n"
    "- A derivation is a sequence of displayed equations, each followed by one "
    "line saying why it follows from the one before.\n"
    "- An equation is only for mathematics: a formula, a relation between "
    "quantities, or arithmetic. A single value, a unit conversion or a chain of "
    "causes goes in a sentence or a table.\n"
    "- Where the video states a formula, even in words, display it. Where its "
    "numbers combine — a count times a size, a total built from parts — show the "
    "arithmetic as a derivation or in a table, never only the result.\n"
    "- Additions beyond the video may include a standard derivation.\n\n"
    "The shape, shown on an unrelated topic. Follow its form; never use its "
    f"content:\n\n<example>\n{RESEARCH_EXAMPLE}\n</example>"
)

WHERE_CENTRAL = (
    "Where a formula or a comparison from the outline's items is central to the "
    "video, include it — the formula as a displayed equation, the comparison as a "
    "Markdown table. Otherwise write prose. Add no equations or tables the video "
    f"does not have.\n{MATHS_NOTATION}"
)

PLAIN_TEXT = (
    "This format is read as plain text. Write any formula in words or in plain "
    "notation such as e^(x/T); use no LaTeX, no dollar-sign maths and no tables."
)

# The formats whose presentation does not depend on the register.
PRESENTATION: dict[ContentType, str] = {
    "summary": WHERE_CENTRAL,
    "blog": WHERE_CENTRAL,
    "social": PLAIN_TEXT,
    "flashcards": PLAIN_TEXT,
    "quiz": PLAIN_TEXT,
}


def presentation_for(content_type: ContentType, register: str) -> str:
    """
    How `content_type` presents its material on a video of this `register`.

    Any register other than "technical" gets the general structure, so a
    general video's notes and research are never shown the maths instructions.
    """
    if content_type not in ("notes", "research"):
        return PRESENTATION[content_type]
    if register != "technical":
        return GENERAL_STRUCTURE
    if content_type == "research":
        return f"{TECHNICAL_STRUCTURE}\n\n{TECHNICAL_RESEARCH}"
    return TECHNICAL_STRUCTURE


def guidance_for(content_type: ContentType, register: str) -> str:
    """What `draft` adds to `content_type`'s own prompt, for a video of this `register`."""
    return f"{FOLLOW_THE_OUTLINE}\n\n{presentation_for(content_type, register)}\n\n{DATA_RULE}"


def _item_lines(item: TechnicalItem) -> list[str]:
    cited = ", ".join(str(i) for i in item.sections)
    head = f"     [{item.kind}] {neutralise(item.title)} (sections {cited})"
    if item.kind == "formula":
        return [head, f"       LaTeX: {neutralise_latex(item.latex)}"]
    if item.kind == "quantity":
        return [head, f"       Value: {neutralise(item.value)}"]
    if item.kind == "table":
        rows = [" | ".join(neutralise(c) for c in item.columns)]
        rows += [" | ".join(neutralise(c) for c in row) for row in item.rows]
        return [head] + [f"       {row}" for row in rows]
    return [head] + [f"       {n}. {neutralise(step)}" for n, step in enumerate(item.steps, start=1)]


def outline_block(outline: Outline) -> str:
    """The outline as one data block, its sections named by index."""
    lines = [f"Thesis: {neutralise(outline.thesis)}", f"Register: {outline.register}", "", "Topics:"]
    for number, topic in enumerate(outline.topics, start=1):
        cited = ", ".join(str(i) for i in topic.sections)
        lines.append(f"{number}. {neutralise(topic.heading)} (sections {cited})")
        lines.extend(f"   - {neutralise(point)}" for point in topic.points)
        if topic.items:
            lines.append("   Items:")
            for item in topic.items:
                lines.extend(_item_lines(item))
    if outline.uncovered:
        listed = ", ".join(str(i) for i in outline.uncovered)
        lines.extend([
            "",
            f"Sections no topic cites: {listed}. Their content still belongs in the "
            "output, under the topic it continues.",
        ])
    if outline.key_terms:
        lines.extend(["", "Key terms:"])
        lines.extend(
            f"- {neutralise(term.term)}: {neutralise(term.definition)}" for term in outline.key_terms
        )
    return "<outline>\n" + "\n".join(lines) + "\n</outline>"


def draft_material(outline: Outline, sections: Sequence[Section]) -> str:
    """Everything `draft` sends as the user message: the outline, then the sections."""
    return f"{outline_block(outline)}\n\n{sections_block(sections)}"
