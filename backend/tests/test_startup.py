"""
The startup hook: the restart sweep runs, and cannot stop the server starting.

`sweep_interrupted_jobs` takes the sweep as an argument, so these tests pass a
stand-in. None of them starts the app's real lifecycle, so no database call is
made — CI has no database to make one against.
"""

import asyncio
import logging
from datetime import timedelta

import pytest

from app.main import app, sweep_interrupted_jobs
from app.services.jobs import INTERRUPTED_AFTER, fail_interrupted


def test_the_default_sweep_is_the_real_one() -> None:
    """Every other test passes a stand-in, so none would notice this changing."""
    assert sweep_interrupted_jobs.__defaults__ == (fail_interrupted,)


def test_the_sweep_is_given_the_shared_threshold() -> None:
    received: list[timedelta] = []

    def sweep(older_than: timedelta) -> int:
        received.append(older_than)
        return 0

    sweep_interrupted_jobs(sweep)
    assert received == [INTERRUPTED_AFTER]


def test_a_sweep_that_changed_jobs_is_logged(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.WARNING, logger="app.main"):
        sweep_interrupted_jobs(lambda _: 3)
    assert "failed 3 interrupted job(s)" in caplog.text


def test_a_sweep_that_changed_nothing_is_quiet(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.WARNING, logger="app.main"):
        sweep_interrupted_jobs(lambda _: 0)
    assert caplog.records == []


def test_a_failing_sweep_does_not_raise_and_is_logged(
    caplog: pytest.LogCaptureFixture,
) -> None:
    def sweep(_: timedelta) -> int:
        raise ConnectionError("database unreachable")

    with caplog.at_level(logging.WARNING, logger="app.main"):
        sweep_interrupted_jobs(sweep)
    assert "restart sweep failed" in caplog.text


def test_starting_the_app_runs_the_sweep_before_serving(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    Enters the app's own lifespan — the one FastAPI built, which wraps ours —
    with the sweep replaced, and checks it ran by the time startup finished.
    """
    calls: list[str] = []
    monkeypatch.setattr("app.main.sweep_interrupted_jobs", lambda: calls.append("swept"))

    async def start() -> None:
        async with app.router.lifespan_context(app):
            calls.append("serving")

    asyncio.run(start())
    assert calls == ["swept", "serving"]
