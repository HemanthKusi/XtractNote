"""
The model call's time limits, and the sweep threshold they are kept inside.

The sweep fails any job still unfinished after `INTERRUPTED_AFTER`, and the
provider call is what makes a run long. These tests check the limits reach the
clients actually built, and that the configured numbers sit inside the threshold.

**They do not prove a call ends in time.** The timeout applies to each phase of
a request, not to an attempt as a whole, and retries add backoff — so a call can
run longer than timeout × attempts.

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


def test_the_configured_limits_sit_inside_the_sweep_threshold() -> None:
    """
    A check on the numbers, not a bound on a call. Raising the timeout or the
    retry count until their product reaches the threshold fails here first.
    """
    attempts = PROVIDER_MAX_RETRIES + 1
    assert timedelta(seconds=PROVIDER_TIMEOUT_SECONDS * attempts) < INTERRUPTED_AFTER


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
