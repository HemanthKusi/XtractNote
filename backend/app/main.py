"""
XtractNote Backend — FastAPI Application Entry Point

This is where the server starts. It:
1. Creates the FastAPI app
2. Adds CORS middleware (Layer 1 security)
3. Registers all API route handlers
4. Provides a health check endpoint
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import youtube, generate, content, folders

# ── Create the FastAPI app ──
app = FastAPI(
    title="XtractNote API",
    description="Multi-agent YouTube to content generator",
    version="0.1.0",
    docs_url="/docs",      # Interactive API docs at http://localhost:8000/docs
    redoc_url="/redoc",    # Alternative docs at http://localhost:8000/redoc
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
        "version": "0.1.0",
    }
