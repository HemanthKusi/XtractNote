"""
XtractNote — Supabase Client

Initializes the Supabase client for the backend.
Uses the SERVICE_ROLE_KEY (not the anon key) because
the backend needs full access to all tables.

The anon key is used by the frontend and respects RLS policies.
The service role key bypasses RLS — the backend applies its own
authorization checks via the get_current_user dependency.
"""

from supabase import create_client, Client
from app.config import settings

# Singleton pattern — one client shared across the app
_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Get the Supabase client instance.
    Creates it on first call, reuses on subsequent calls.
    """
    global _supabase_client

    if _supabase_client is None:
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )

    return _supabase_client
