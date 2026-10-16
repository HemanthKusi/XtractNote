"""
The model call behind `analyse`: the sections in, a checked outline out.

A failed call and an unusable answer both fail the job with "analysis-failed";
a provider that is not configured keeps its own code, since that is not
something trying again can fix.
"""

from typing import Sequence

from app.agents.outline import ANALYSIS_FAILED, Outline, outline_from
from app.agents.prompts.analyse import ANALYSE_SYSTEM_PROMPT
from app.agents.prompts.data import sections_block
from app.agents.sections import Section
from app.services.generate import GenerationError, complete, parse_json_object


def analysis_material(sections: Sequence[Section]) -> str:
    """The sections, and how many there are, so coverage can be checked against it."""
    count = len(sections)
    return (
        f"There are {count} sections, numbered 0 to {count - 1}. Check that every "
        f"one appears in at least one topic.\n\n{sections_block(sections)}"
    )


def analyse_sections(sections: Sequence[Section]) -> Outline:
    """The outline of `sections`, from one call to the analysis model."""
    try:
        content = complete(
            ANALYSE_SYSTEM_PROMPT, analysis_material(sections), json_mode=True, purpose="analysis"
        )
        parsed = parse_json_object(content)
    except GenerationError as exc:
        if exc.code == "provider-misconfigured":
            raise
        raise GenerationError(ANALYSIS_FAILED, exc.message) from exc
    return outline_from(parsed, len(sections))
