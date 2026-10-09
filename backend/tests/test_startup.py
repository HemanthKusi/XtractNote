"""
The sweep: it runs before the server serves, keeps running on a timer, and
cannot stop the server starting or the timer ticking.

The sweep is replaced with a stand-in throughout, so no database call is made —
CI has no database to make one against. The timer is shortened to milliseconds
where a test needs it to tick.
"""

import asyncio
import logging
from datetime import timedelta

import pytest

from app.main import app, sweep_every, sweep_interrupted_jobs
from app.services.jobs import INTERRUPTED_AFTER, fail_interrupted

TICK = timedelta(milliseconds=10)


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
    assert "sweep failed" in caplog.text


# --- The timer ----------------------------------------------------------------


def test_the_timer_keeps_sweeping(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []
    monkeypatch.setattr("app.main.sweep_interrupted_jobs", lambda: calls.append("swept"))

    async def tick_a_few_times() -> None:
        timer = asyncio.create_task(sweep_every(TICK))
        await asyncio.sleep(TICK.total_seconds() * 10)
        timer.cancel()

    asyncio.run(tick_a_few_times())
    assert len(calls) >= 2


def test_the_timer_survives_a_failing_sweep(monkeypatch: pytest.MonkeyPatch) -> None:
    """A sweep that fails on one tick still runs on the next."""
    attempts: list[str] = []

    def failing(_: timedelta) -> int:
        attempts.append("tried")
        raise ConnectionError("database unreachable")

    real = sweep_interrupted_jobs
    monkeypatch.setattr("app.main.sweep_interrupted_jobs", lambda: real(failing))

    async def tick_a_few_times() -> None:
        timer = asyncio.create_task(sweep_every(TICK))
        await asyncio.sleep(TICK.total_seconds() * 10)
        timer.cancel()

    asyncio.run(tick_a_few_times())
    assert len(attempts) >= 2


# --- The app's own lifespan ---------------------------------------------------


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
    assert calls[:2] == ["swept", "serving"]


def test_the_app_sweeps_on_its_timer_and_stops_at_shutdown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []
    monkeypatch.setattr("app.main.sweep_interrupted_jobs", lambda: calls.append("swept"))
    monkeypatch.setattr("app.services.jobs.SWEEP_EVERY", TICK)

    async def serve_then_stop() -> int:
        async with app.router.lifespan_context(app):
            await asyncio.sleep(TICK.total_seconds() * 10)
        stopped_at = len(calls)
        await asyncio.sleep(TICK.total_seconds() * 10)
        return stopped_at

    stopped_at = asyncio.run(serve_then_stop())
    assert stopped_at >= 3, "the startup sweep plus at least two timer sweeps"
    assert len(calls) == stopped_at, "no sweep after shutdown"
