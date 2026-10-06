"""
The backend imports cleanly and registers its routes.

This is the smallest test that is still worth running, rather than filler to
make the suite non-empty. Importing `app.main` walks the whole import chain:
`app.config` builds its `Settings` object at module scope, all four routers
are imported and registered, and the Supabase client module is loaded. So this
fails loudly when

- a new required setting is added and the CI environment is not told about it,
- a router stops importing,
- or something starts doing real work at import time instead of on first call.

It needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to be present, because
`Settings` declares those two with no default. The values are never used: no
test here reaches the network, since `get_supabase_client` constructs its
client on first call rather than at import. Placeholders are therefore enough,
and the workflow supplies obviously fake ones. Locally, `backend/.env` already
provides real ones.
"""


def test_app_imports() -> None:
    """The FastAPI application object can be built."""
    from app.main import app

    assert app.title == "XtractNote API"


def test_health_route_is_registered() -> None:
    """
    The health endpoint is mounted.

    It is the one route a deployment platform calls to decide whether the
    service is alive, so losing it would be invisible until a host marked the
    backend unhealthy.
    """
    from app.main import app

    paths = {getattr(route, "path", None) for route in app.routes}
    assert "/api/health" in paths
