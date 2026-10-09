"""
XtractNote — Where background generations run

A fixed number of slots, each running one generation on a thread of its own,
separate from the threads that handle requests — so a generation that takes
minutes never holds a thread a request needs. The slot count caps how many
generations this process runs, and pays for, at once.

**It refuses rather than queues.** `reserve` takes a free slot or returns None
at once. A queue here would live in memory, be lost on a restart, and could
hold jobs unclaimed long enough for the sweep to fail them before they started.
When a job's input becomes durable, waiting belongs in the job table instead.

**A slot is used exactly once.** The endpoint reserves one, creates the job,
then either starts the work in it or releases it unused. A started slot is
freed when the work returns or raises.

**Shutdown is bounded.** `close` stops admitting work and waits a grace period
for running generations, then returns. The threads are daemon threads, so the
process does not wait on a generation past that point; one cut off there stops
beating, and the sweep fails its job. A standard thread pool cannot do this:
the interpreter waits for its threads at exit, for as long as they take.
"""

import logging
import threading
import time
from typing import Callable

from app.config import settings

logger = logging.getLogger(__name__)

#: How long shutdown waits for running generations before letting the process go.
SHUTDOWN_GRACE_SECONDS = 30.0


class Slot:
    """One reserved place in the pool. Start work in it, or release it."""

    def __init__(self, pool: "GenerationPool") -> None:
        self._pool = pool
        self._used = False

    def start(self, work: Callable[[], object]) -> bool:
        """
        Run `work` on a thread of its own. Returns False if the pool has closed
        since the slot was reserved; the slot is then released and nothing runs.
        """
        self._claim_use()
        return self._pool._submit(work)

    def release(self) -> None:
        """Give the slot back without running anything."""
        self._claim_use()
        self._pool._free_slot()

    def _claim_use(self) -> None:
        if self._used:
            raise RuntimeError("a slot is started or released once")
        self._used = True


class GenerationPool:
    """A fixed number of slots, and the threads that run the work started in them."""

    def __init__(self, workers: int) -> None:
        if workers < 1:
            raise ValueError("a generation pool needs at least one worker")
        self._slots = threading.BoundedSemaphore(workers)
        self._closed = False
        self._lock = threading.Lock()
        self._running: set[threading.Thread] = set()

    def reserve(self) -> Slot | None:
        """A free slot, or None at once if every slot is busy or the pool is closed."""
        with self._lock:
            if self._closed:
                return None
        if not self._slots.acquire(blocking=False):
            return None
        return Slot(self)

    def close(self, grace_seconds: float = SHUTDOWN_GRACE_SECONDS) -> int:
        """
        Stop admitting work, wait up to `grace_seconds` for running work, and
        return how many generations were still running when it stopped waiting.
        Work still running is not interrupted.
        """
        with self._lock:
            self._closed = True
            running = list(self._running)

        deadline = time.monotonic() + grace_seconds
        for thread in running:
            thread.join(timeout=max(0.0, deadline - time.monotonic()))

        with self._lock:
            still_running = sum(1 for thread in self._running if thread.is_alive())
        if still_running:
            logger.warning(
                "shutting down with %d generation(s) still running; the sweep will fail them",
                still_running,
            )
        return still_running

    def _submit(self, work: Callable[[], object]) -> bool:
        def run() -> None:
            try:
                work()
            except Exception:
                logger.exception("generation work raised")
            finally:
                with self._lock:
                    self._running.discard(threading.current_thread())
                self._free_slot()

        # Registered and started under one lock, so `close` never sees a thread
        # it cannot join: joining one that has not started raises.
        with self._lock:
            if self._closed:
                closed, started = True, False
            else:
                closed = False
                thread = threading.Thread(target=run, name="generation", daemon=True)
                try:
                    thread.start()
                    self._running.add(thread)
                    started = True
                except RuntimeError:
                    # The interpreter could not start another thread.
                    started = False

        if closed:
            # The pool closed between the reserve and the start.
            self._free_slot()
            return False
        if not started:
            self._free_slot()
            logger.error("could not start a generation thread")
            return False
        return True

    def _free_slot(self) -> None:
        self._slots.release()


_pool = GenerationPool(settings.generation_workers)


def get_generation_pool() -> GenerationPool:
    """The process's pool. A FastAPI dependency, so tests can supply their own."""
    return _pool
