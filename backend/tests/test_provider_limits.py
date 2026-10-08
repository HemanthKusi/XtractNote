"""
The model call's time limits, and the restart sweep they must stay under.

The sweep fails any job still unfinished after `INTERRUPTED_AFTER`. A run's
long step is the provider call, so if that call could outlast the threshold, the
sweep would fail runs that are still alive. These tests hold the two together,
and check that the limits reach the clients actually built.

Building a client makes no network call. A placeholder API key is set for the
duration of each test, because the builders refuse to run without one and CI
has none.
"""

from datetime import timedelta

import pytest

from app.config import settings
from app.services.generate import (
    PROVIDER_MAX_RETRIES,
    PROVIDER_TIMEOUT_SECONDS,
    _build_anthropic,
    _build_openai,
)
from app.services.jobs import INTERRUPTED_AFTER


def test_the_longest_call_ends_before_the_sweep_threshold() -> None:
    """
    Every attempt can wait the full timeout, so the worst case is the timeout
    times the number of attempts. Raise either constant past the threshold and
    this fails, rather than the sweep failing live runs.
    """
    attempts = PROVIDER_MAX_RETRIES + 1
    worst_case = timedelta(seconds=PROVIDER_TIMEOUT_SECONDS * attempts)
    assert worst_case < INTERRUPTED_AFTER


def test_the_call_has_a_limit_at_all() -> None:
    assert PROVIDER_TIMEOUT_SECONDS > 0


@pytest.mark.parametrize("json_mode", [False, True])
def test_the_openai_client_carries_the_limits(
    monkeypatch: pytest.MonkeyPatch, json_mode: bool
) -> None:
    monkeypatch.setattr(settings, "openai_api_key", "sk-test-placeholder")
    client = _build_openai(json_mode=json_mode).root_client
    assert client.timeout == PROVIDER_TIMEOUT_SECONDS
    assert client.max_retries == PROVIDER_MAX_RETRIES


def test_the_anthropic_client_carries_the_limits(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-test-placeholder")
    client = _build_anthropic()._client
    assert client.timeout == PROVIDER_TIMEOUT_SECONDS
    assert client.max_retries == PROVIDER_MAX_RETRIES
