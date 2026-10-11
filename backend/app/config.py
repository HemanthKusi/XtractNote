"""
XtractNote Backend — Configuration

Loads environment variables and validates that required values are present.
If a required variable is missing, the app won't start (fail fast).
"""

from pydantic import Field
from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    """
    All environment variables the backend needs.

    Pydantic Settings automatically reads from:
    1. Environment variables
    2. A .env file in the backend/ directory

    If a required variable is missing, the app crashes on startup
    with a clear error — not silently at runtime.
    """

    # ── Supabase ──
    supabase_url: str
    supabase_service_role_key: str

    # ── AI Provider ──
    ai_provider: Literal["openai", "anthropic"] = "openai"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    openai_model: str = "gpt-4o"
    anthropic_model: str = "claude-sonnet-4-6"

    # ── YouTube ──
    youtube_api_key: str = ""

    # ── Server ──
    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"

    # ── Generation ──
    # How many generations this server process runs at once. Requests beyond
    # it are refused as busy rather than queued.
    generation_workers: int = Field(default=4, ge=1)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Create a singleton instance — import this wherever you need config
settings = Settings()
