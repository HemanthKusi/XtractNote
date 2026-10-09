"""
XtractNote — Where background generations run

A dedicated pool of worker threads, separate from the ones that handle
requests, so a generation that takes minutes never holds a thread a request
needs. Its size caps how many generations this process runs — and pays for —
at once.

**It refuses rather than queues.** `reserve` takes a free slot or returns None
at once. A queue here would live in memory, be lost on a restart, and could
hold jobs unclaimed long enough for the sweep to fail them before they started.
When a job's input becomes durable, waiting belongs in the job table instead.

**A slot is used exactly once.** The endpoint reserves one, creates the job,
then either starts the work in it or releases it unused. A started slot is
freed when the work returns or raises.
"""

import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Callable

from app.config import settings

logger = logging.getLogger(__name__)


class Slot:
    """One reserved place in the pool. Start work in it, or release it."""

    def __init__(self, pool: "GenerationPool") -> None:
        self._pool = pool
        self._used = False

    def start(self, work: Callable[[], object]) -> bool:
        """
        Run `work` on the pool. Returns False if the pool has closed since the
        slot was reserved; the slot is then released and nothing runs.
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
    """A fixed number of worker threads, and the slots that admit work to them."""

    def __init__(self, workers: int) -> None:
        if workers < 1:
            raise ValueError("a generation pool needs at least one worker")
        self._slots = threading.BoundedSemaphore(workers)
        self._executor = ThreadPoolExecutor(
            max_workers=workers, thread_name_prefix="generation"
        )
        self._closed = False
        self._lock = threading.Lock()

    def reserve(self) -> Slot | None:
        """A free slot, or None at once if every worker is busy or the pool is closed."""
        with self._lock:
            if self._closed:
                return None
        if not self._slots.acquire(blocking=False):
            return None
        return Slot(self)

    def close(self) -> None:
        """Stop admitting work. Work already running is not interrupted, and this does not wait for it."""
        with self._lock:
            self._closed = True
        self._executor.shutdown(wait=False)

    def _submit(self, work: Callable[[], object]) -> bool:
        def run() -> None:
            try:
                work()
            except Exception:
                logger.exception("generation work raised")
            finally:
                self._free_slot()

        try:
            self._executor.submit(run)
        except RuntimeError:
            # The executor shut down between the reserve and the start.
            self._free_slot()
            return False
        return True

    def _free_slot(self) -> None:
        self._slots.release()


_pool = GenerationPool(settings.generation_workers)


def get_generation_pool() -> GenerationPool:
    """The process's pool. A FastAPI dependency, so tests can supply their own."""
    return _pool
