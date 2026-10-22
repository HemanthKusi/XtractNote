"""
XtractNote — Supabase Client

Initializes the Supabase client for the backend.
Uses the SERVICE_ROLE_KEY (not the anon key) because
the backend needs full access to all tables.

The anon key is used by the frontend and respects RLS policies.
The service role key bypasses RLS — the backend applies its own
authorization checks via the get_current_user dependency.
"""

from supabase import ClientOptions, create_client, Client
from app.config import settings

#: How long a heartbeat's request may wait on the database, for each phase
#: of the request — connecting, sending, waiting for the reply.
HEARTBEAT_TIMEOUT_SECONDS = 10.0

# Singleton pattern — one client shared across the app
_supabase_client: Client | None = None
_heartbeat_client: Client | None = None


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


def get_heartbeat_client() -> Client:
    """
    A second client, for job heartbeats only, whose requests give up after
    HEARTBEAT_TIMEOUT_SECONDS instead of the library's default 120.

    A heartbeat is only useful if it lands before the sweep's threshold, and
    the next beat waits for the last one to return. A beat held for two
    minutes by a stalled request delays the next by as long — which can be
    enough on its own for the sweep to fail a run that is still going.
    """
    global _heartbeat_client

    if _heartbeat_client is None:
        _heartbeat_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
            options=ClientOptions(postgrest_client_timeout=HEARTBEAT_TIMEOUT_SECONDS),
        )

    return _heartbeat_client
