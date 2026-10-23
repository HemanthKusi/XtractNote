"""
XtractNote — LLM tracing is off unless it is allowed

LangChain, which generation runs through, sends every prompt, transcript and
model output to an external tracing service when tracing is switched on —
and the environment alone switches it on. One variable left on a server from
debugging would ship users' transcripts and drafts to a third party, with no
change to the code and nothing in the logs.

So the backend refuses to start while any tracing variable is on, unless
`allow_llm_tracing` says so.

**The rule is stricter than the library's.** The installed client reads a
variable as on only when it is exactly "true". Here, anything other than
empty or "false" (in any letter case) counts as on.

**Two layers, as elsewhere.** `enabled_tracing_variables` and
`tracing_refusal` are pure; `refuse_unallowed_tracing` reads the process
environment and the setting.
"""

import logging
import os
from collections.abc import Mapping

from app.config import settings

logger = logging.getLogger(__name__)

#: The variables the installed tracing client reads to switch tracing on —
#: in langsmith 0.14.4, `TRACING_V2` then `TRACING`, each under both prefixes.
TRACING_VARIABLES: tuple[str, ...] = (
    "LANGSMITH_TRACING_V2",
    "LANGCHAIN_TRACING_V2",
    "LANGSMITH_TRACING",
    "LANGCHAIN_TRACING",
)

#: The values that leave tracing off. Compared in lower case.
OFF_VALUES: frozenset[str] = frozenset({"", "false"})

#: The setting that allows tracing, as it is spelled in the environment.
ALLOW_SETTING = "ALLOW_LLM_TRACING"


def enabled_tracing_variables(environ: Mapping[str, str]) -> list[str]:
    """The tracing variables in `environ` that are on, in TRACING_VARIABLES order."""
    return [
        name
        for name in TRACING_VARIABLES
        if name in environ and environ[name].lower() not in OFF_VALUES
    ]


def tracing_refusal(enabled: list[str], allowed: bool) -> str | None:
    """
    Why the backend must not start, or None if it may.

    Names the variables and the setting that would allow them. Never their
    values: a mistyped secret pasted into one would otherwise reach the logs.
    """
    if not enabled or allowed:
        return None
    return (
        f"LLM tracing is switched on by {', '.join(enabled)}, which would send "
        "users' transcripts and drafts to an external tracing service. Unset "
        f"it, or set {ALLOW_SETTING}=true to allow it deliberately."
    )


def refuse_unallowed_tracing(
    environ: Mapping[str, str] | None = None,
    allowed: bool | None = None,
) -> None:
    """
    Raise RuntimeError if tracing is on and not allowed. If it is on and
    allowed, log that once.

    Defaults to the process environment, which is what the tracing client
    reads, and to the `allow_llm_tracing` setting.
    """
    environ = os.environ if environ is None else environ
    allowed = settings.allow_llm_tracing if allowed is None else allowed

    enabled = enabled_tracing_variables(environ)
    if (reason := tracing_refusal(enabled, allowed)) is not None:
        raise RuntimeError(reason)
    if enabled:
        logger.warning(
            "LLM tracing is on (%s), allowed by %s", ", ".join(enabled), ALLOW_SETTING
        )
