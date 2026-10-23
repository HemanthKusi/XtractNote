"""
LLM tracing: the backend refuses to start while tracing is on and not allowed.

The rules are pure and tested directly. The variable list is also checked
against the installed tracing client, so a library upgrade that renamed one
would fail here instead of leaving a gap the check does not cover.
"""

import logging
from collections.abc import Iterator

import pytest
from langsmith import utils as langsmith_utils

from app.config import Settings, settings
from app.llm_tracing import (
    ALLOW_SETTING,
    TRACING_VARIABLES,
    enabled_tracing_variables,
    refuse_unallowed_tracing,
    tracing_refusal,
)


@pytest.fixture(autouse=True)
def no_tracing_variables(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Each test starts from an environment with none of the four set."""
    for name in TRACING_VARIABLES:
        monkeypatch.delenv(name, raising=False)
    langsmith_utils.get_env_var.cache_clear()
    yield
    langsmith_utils.get_env_var.cache_clear()


# --- Which variables are on ---------------------------------------------------


@pytest.mark.parametrize("name", TRACING_VARIABLES)
def test_each_variable_set_to_true_is_on(name: str) -> None:
    assert enabled_tracing_variables({name: "true"}) == [name]


@pytest.mark.parametrize("value", ["true", "TRUE", "True", "1", "yes", "0", " ", "false "])
def test_any_value_but_empty_or_false_is_on(value: str) -> None:
    """Stricter than the client: anything it might one day read as on is refused now."""
    assert enabled_tracing_variables({"LANGSMITH_TRACING": value}) == ["LANGSMITH_TRACING"]


@pytest.mark.parametrize("value", ["", "false", "FALSE", "False"])
def test_empty_or_false_in_any_case_is_off(value: str) -> None:
    assert enabled_tracing_variables({name: value for name in TRACING_VARIABLES}) == []


def test_an_environment_without_them_is_off() -> None:
    assert enabled_tracing_variables({"LANGSMITH_API_KEY": "key", "PATH": "/usr/bin"}) == []


def test_every_variable_that_is_on_is_reported_in_order() -> None:
    environ = {name: "true" for name in reversed(TRACING_VARIABLES)}
    assert enabled_tracing_variables(environ) == list(TRACING_VARIABLES)


# --- The list matches the installed client -------------------------------------


@pytest.mark.parametrize("name", TRACING_VARIABLES)
def test_the_installed_client_traces_when_each_variable_is_true(
    monkeypatch: pytest.MonkeyPatch, name: str
) -> None:
    """If an upgrade stops reading one of these, the list is out of date."""
    monkeypatch.setenv(name, "true")
    langsmith_utils.get_env_var.cache_clear()
    assert langsmith_utils.tracing_is_enabled() is True


def test_the_installed_client_does_not_trace_without_them() -> None:
    assert langsmith_utils.tracing_is_enabled() is False


# --- The refusal ----------------------------------------------------------------


def test_tracing_on_and_not_allowed_is_refused_naming_the_variable_and_the_setting() -> None:
    reason = tracing_refusal(["LANGCHAIN_TRACING_V2"], allowed=False)
    assert reason is not None
    assert "LANGCHAIN_TRACING_V2" in reason and f"{ALLOW_SETTING}=true" in reason


def test_tracing_on_and_allowed_is_not_refused() -> None:
    assert tracing_refusal(["LANGCHAIN_TRACING_V2"], allowed=True) is None


def test_tracing_off_is_never_refused() -> None:
    assert tracing_refusal([], allowed=False) is None


def test_the_refusal_never_carries_a_value() -> None:
    with pytest.raises(RuntimeError) as caught:
        refuse_unallowed_tracing({"LANGSMITH_TRACING": "sk-not-a-flag-123"}, allowed=False)
    assert "sk-not-a-flag-123" not in str(caught.value)
    assert "LANGSMITH_TRACING" in str(caught.value)


# --- Reading the process environment and the setting ---------------------------


def test_the_process_environment_is_read_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LANGCHAIN_TRACING", "true")
    with pytest.raises(RuntimeError):
        refuse_unallowed_tracing(allowed=False)


def test_the_setting_is_read_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LANGCHAIN_TRACING", "true")
    monkeypatch.setattr(settings, "allow_llm_tracing", True)
    refuse_unallowed_tracing()


def test_allowed_tracing_is_logged_once(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.WARNING, logger="app.llm_tracing"):
        refuse_unallowed_tracing({"LANGSMITH_TRACING_V2": "true"}, allowed=True)
    assert len(caplog.records) == 1
    assert "LANGSMITH_TRACING_V2" in caplog.text and ALLOW_SETTING in caplog.text


def test_tracing_off_logs_nothing(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.WARNING, logger="app.llm_tracing"):
        refuse_unallowed_tracing({}, allowed=False)
    assert caplog.records == []


def test_tracing_is_not_allowed_by_default() -> None:
    assert Settings.model_fields["allow_llm_tracing"].default is False
