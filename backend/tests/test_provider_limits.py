"""
The model call's time limits reach the clients actually built.

A background run keeps its job's heartbeat going while it waits on the
provider, so a call with no timeout would hold a hung job open indefinitely.
These tests check a limit exists and that both clients carry it.

Building a client makes no network call. A placeholder API key is set for the
duration of each test, because the builders refuse to run without one and CI
has none.
"""

import pytest

from app.config import settings
from app.services.generate import (
    PROVIDER_MAX_RETRIES,
    PROVIDER_TIMEOUT_SECONDS,
    _build_anthropic,
    _build_openai,
)


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
