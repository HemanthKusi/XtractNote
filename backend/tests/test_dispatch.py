"""
The generation pool: how many run at once, what is refused, and that a slot
always comes back.

Work here is a function that waits on an event, so "N running at once" is real
threads genuinely occupying the pool. Each test makes its own pool and closes it.
"""

import threading
import time
from collections.abc import Iterator

import pytest

from app.config import Settings, settings
from app.services.dispatch import GenerationPool, Slot, get_generation_pool

WAIT = 2.0  # seconds; a ceiling on how long any test waits, never a sleep


@pytest.fixture
def pool() -> Iterator[GenerationPool]:
    made = GenerationPool(2)
    yield made
    made.close(grace_seconds=WAIT)


def hold(release: threading.Event, started: threading.Semaphore | None = None):
    """Work that occupies its thread until `release` is set."""
    def work() -> None:
        if started:
            started.release()
        release.wait(WAIT)
    return work


def until(condition, timeout: float = WAIT) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if condition():
            return True
        time.sleep(0.005)
    return condition()


# --- Admission ----------------------------------------------------------------


def test_a_pool_hands_out_as_many_slots_as_it_has_workers(pool: GenerationPool) -> None:
    first, second = pool.reserve(), pool.reserve()
    assert isinstance(first, Slot) and isinstance(second, Slot)
    assert pool.reserve() is None
    first.release()
    second.release()


def test_n_runs_at_once_and_the_next_is_refused(pool: GenerationPool) -> None:
    release, started = threading.Event(), threading.Semaphore(0)
    for _ in range(2):
        slot = pool.reserve()
        assert slot is not None and slot.start(hold(release, started))
    assert started.acquire(timeout=WAIT) and started.acquire(timeout=WAIT)

    assert pool.reserve() is None, "both workers are busy"
    release.set()


def test_refusal_is_immediate_not_a_wait(pool: GenerationPool) -> None:
    release = threading.Event()
    for _ in range(2):
        pool.reserve().start(hold(release))
    began = time.monotonic()
    assert pool.reserve() is None
    assert time.monotonic() - began < 0.1
    release.set()


# --- A slot always comes back -------------------------------------------------


def test_a_slot_is_freed_when_its_work_finishes(pool: GenerationPool) -> None:
    done = threading.Event()
    for _ in range(2):
        pool.reserve().start(done.set)
    assert until(lambda: (slot := pool.reserve()) is not None and (slot.release() or True))


def test_a_slot_is_freed_when_its_work_raises(pool: GenerationPool) -> None:
    def boom() -> None:
        raise RuntimeError("generation exploded")

    for _ in range(2):
        pool.reserve().start(boom)
    assert until(lambda: (slot := pool.reserve()) is not None and (slot.release() or True))


def test_a_released_slot_is_available_again(pool: GenerationPool) -> None:
    pool.reserve().release()
    pool.reserve().release()
    first, second = pool.reserve(), pool.reserve()
    assert first is not None and second is not None
    first.release()
    second.release()


@pytest.mark.parametrize("first", ["start", "release"])
@pytest.mark.parametrize("second", ["start", "release"])
def test_a_slot_cannot_be_used_twice(pool: GenerationPool, first: str, second: str) -> None:
    """Using one twice would free a slot that was never taken, growing the pool."""
    slot = pool.reserve()
    use = {"start": lambda: slot.start(lambda: None), "release": slot.release}
    use[first]()
    with pytest.raises(RuntimeError):
        use[second]()


# --- Shutdown -----------------------------------------------------------------


def test_a_closed_pool_admits_nothing() -> None:
    closed = GenerationPool(2)
    closed.close()
    assert closed.reserve() is None


def test_a_slot_reserved_before_close_does_not_run_and_is_freed() -> None:
    racing = GenerationPool(1)
    slot = racing.reserve()
    racing.close(grace_seconds=0)
    ran: list[str] = []
    assert slot.start(lambda: ran.append("ran")) is False
    assert ran == []
    # A closed pool's reserve() returns None regardless, so it cannot show the
    # slot came back. The semaphore can: its one permit must be free again.
    assert racing._slots.acquire(blocking=False), "the slot was not freed"


def test_close_does_not_interrupt_running_work() -> None:
    running = GenerationPool(1)
    release, started, finished = threading.Event(), threading.Semaphore(0), threading.Event()

    def work() -> None:
        started.release()
        release.wait(WAIT)
        finished.set()

    running.reserve().start(work)
    assert started.acquire(timeout=WAIT)
    running.close(grace_seconds=0)
    release.set()
    assert finished.wait(WAIT), "work in progress at close still completed"


def test_close_waits_for_running_work_within_the_grace_period() -> None:
    draining = GenerationPool(1)
    finished = threading.Event()

    def work() -> None:
        time.sleep(0.05)
        finished.set()

    draining.reserve().start(work)
    assert draining.close(grace_seconds=WAIT) == 0
    assert finished.is_set(), "close returned before work it could wait for had finished"


def test_close_stops_waiting_once_the_grace_period_is_over() -> None:
    """Shutdown is bounded: a generation still running does not hold it up."""
    stuck = GenerationPool(1)
    release = threading.Event()
    stuck.reserve().start(hold(release))
    began = time.monotonic()
    assert stuck.close(grace_seconds=0.05) == 1
    assert time.monotonic() - began < 1.0
    release.set()


def test_generation_threads_do_not_hold_up_process_exit() -> None:
    """Daemon threads: the interpreter does not wait for them when it exits."""
    daemon: list[bool] = []
    done = threading.Event()
    pool = GenerationPool(1)

    def work() -> None:
        daemon.append(threading.current_thread().daemon)
        done.set()

    pool.reserve().start(work)
    assert done.wait(WAIT)
    assert daemon == [True]
    pool.close(grace_seconds=WAIT)


# --- Configuration ------------------------------------------------------------


def test_a_pool_needs_at_least_one_worker() -> None:
    with pytest.raises(ValueError):
        GenerationPool(0)


def test_the_setting_defaults_to_four_and_refuses_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    """Built without the .env file, so the required values are supplied as placeholders."""
    monkeypatch.setenv("SUPABASE_URL", "https://placeholder.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "placeholder")
    monkeypatch.delenv("GENERATION_WORKERS", raising=False)
    assert Settings(_env_file=None).generation_workers == 4
    monkeypatch.setenv("GENERATION_WORKERS", "0")
    with pytest.raises(ValueError):
        Settings(_env_file=None)


def test_the_process_pool_is_sized_by_the_setting() -> None:
    process_pool = get_generation_pool()
    slots = [process_pool.reserve() for _ in range(settings.generation_workers)]
    try:
        assert all(slot is not None for slot in slots)
        assert process_pool.reserve() is None
    finally:
        for slot in slots:
            if slot is not None:
                slot.release()
