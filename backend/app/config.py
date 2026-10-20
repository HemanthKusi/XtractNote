"""
XtractNote Backend — Configuration

Loads environment variables and validates that required values are present.
If a required variable is missing, the app won't start (fail fast).
"""

from pydantic import Field, model_validator
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
    # The model the pipeline's analysis step uses. Empty means the main model
    # above; set it once a cheaper model's current pricing has been checked.
    openai_analysis_model: str = ""
    anthropic_analysis_model: str = ""
    # The model notes and research are drafted with. gpt-5.4 was chosen
    # 2026-10-16 after a side-by-side test showed gpt-4o ignoring the structure
    # those formats ask for. Empty means the main model above. Its output limit
    # must cover DEPTH_OUTPUT_TOKENS in generate.py.
    openai_depth_model: str = "gpt-5.4"
    anthropic_depth_model: str = ""

    # ── YouTube ──
    youtube_api_key: str = ""
    # How many calls of each kind one user may make in an hour, each spending
    # the project's shared YouTube quota. Enforced by the database (migration
    # 015), so they hold across processes. A search spends over a hundred
    # times the quota a metadata or length lookup does. The length lookup is
    # the one a start or a quote makes to price a video, and both count
    # against it.
    youtube_search_per_hour: int = Field(default=20, ge=1)
    youtube_metadata_per_hour: int = Field(default=120, ge=1)
    video_length_lookups_per_hour: int = Field(default=30, ge=1)

    # ── Server ──
    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"

    # ── Generation ──
    # How many generations this server process runs at once. Requests beyond
    # it are refused as busy rather than queued.
    generation_workers: int = Field(default=4, ge=1)
    # How many unfinished generations one user may have. Enforced by the
    # database when a job is created (migration 010), so it holds across
    # processes. It may not exceed generation_workers.
    generation_per_user: int = Field(default=2, ge=1)
    # How old a stored transcript may be and still be used instead of fetching
    # the video's captions again (migration 011).
    transcript_reuse_days: int = Field(default=30, ge=0)
    # The credits an account holds after each monthly refill (migration 013).
    # A refill resets the balance to this; unused credits do not roll over.
    credits_per_month: int = Field(default=30, ge=1)

    @model_validator(mode="after")
    def _per_user_limit_fits_the_pool(self) -> "Settings":
        if self.generation_per_user > self.generation_workers:
            raise ValueError(
                "generation_per_user cannot be larger than generation_workers"
            )
        return self

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Create a singleton instance — import this wherever you need config
settings = Settings()
