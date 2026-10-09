"""
XtractNote Backend — FastAPI Application Entry Point

This is where the server starts. It:
1. Creates the FastAPI app
2. Fails generation jobs left unfinished — at startup, then on a timer
3. Adds CORS middleware (Layer 1 security)
4. Registers all API route handlers
5. Provides a health check endpoint
"""

import asyncio
import logging
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager, suppress
from datetime import timedelta

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import youtube, generate, content, folders
from app.services import jobs

logger = logging.getLogger(__name__)


# ── The sweep: at startup, then on a timer ──
def sweep_interrupted_jobs(
    sweep: Callable[[timedelta], int] = jobs.fail_interrupted,
) -> None:
    """
    Fail jobs whose run was lost.

    A run happens inside a server process, so one that dies mid-run leaves its
    job with nothing to end it. Such a job's heartbeat stays recent for up to
    `STALE_AFTER` after the run stopped, so a sweep at startup alone can miss it
    — hence the timer as well.

    A failure here is logged and swallowed: refusing to start, or stopping the
    timer, over a cleanup step would turn a database blip into an outage.
    """
    try:
        swept = sweep(jobs.STALE_AFTER)
    except Exception:
        logger.warning("sweep failed; unfinished jobs were left as they were", exc_info=True)
        return
    if swept:
        logger.warning("sweep: failed %d interrupted job(s)", swept)


async def sweep_every(interval: timedelta) -> None:
    """Run the sweep once per `interval`, until cancelled."""
    while True:
        await asyncio.sleep(interval.total_seconds())
        # A blocking database call, so it runs on a worker thread.
        await run_in_threadpool(sweep_interrupted_jobs)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Sweep before the first request is served, then keep sweeping until shutdown."""
    await run_in_threadpool(sweep_interrupted_jobs)
    # Held in a local so the task is not garbage-collected while it runs.
    timer = asyncio.create_task(sweep_every(jobs.SWEEP_EVERY))
    try:
        yield
    finally:
        timer.cancel()
        with suppress(asyncio.CancelledError):
            await timer


# ── Create the FastAPI app ──
app = FastAPI(
    title="XtractNote API",
    description="Turns YouTube videos into written content",
    version="0.2.0",
    docs_url="/docs",      # Interactive API docs at http://localhost:8000/docs
    redoc_url="/redoc",    # Alternative docs at http://localhost:8000/redoc
    lifespan=lifespan,
)

# ── Layer 1: CORS Middleware ──
# Only requests from the frontend URL are allowed.
# A random website cannot call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,      # http://localhost:3000 in dev
        "http://localhost:3000",     # Always allow local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register API Routes ──
app.include_router(youtube.router, prefix="/api/youtube", tags=["YouTube"])
app.include_router(generate.router, prefix="/api/generate", tags=["Generate"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(folders.router, prefix="/api/folders", tags=["Folders"])


# ── Health Check ──
@app.get("/api/health", tags=["System"])
async def health_check():
    """
    Simple health check. Returns OK if the server is running.
    Used by deployment platforms to verify the app is alive.
    """
    return {
        "status": "ok",
        "service": "xtractnote-api",
        "version": "0.2.0",
    }
