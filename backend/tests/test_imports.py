"""
The backend imports cleanly and registers its routes.

This is the smallest test that is still worth running, rather than filler to
make the suite non-empty. Importing `app.main` walks the import chain that the
running server walks: `app.config` builds its `Settings` object at module
scope, all four routers are imported and registered, and the services and
utilities those routers pull in are loaded with them. So this fails loudly when

- a new required setting is added and the environment is not told about it,
- a router or one of its services stops importing,
- a router stops being registered,
- or something starts doing real work at import time instead of on first call.

**It does not reach `app.db.supabase`.** Only `app.api.dependencies` imports
that module, and no router imports `dependencies`, so neither is loaded by
importing `app.main` — verified by inspecting `sys.modules` afterwards. That is
why the Supabase module gets an import test of its own below rather than being
claimed as covered here.

The two settings this needs are `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`,
because `Settings` declares them with no default. Their values are never used:
nothing here reaches the network, since `get_supabase_client` constructs its
client on first call rather than at import. Placeholders are therefore enough,
and the workflow supplies obviously fake ones. Locally, `backend/.env` already
provides real ones.
"""

# One path per router, so losing an `include_router` call fails the suite
# instead of silently removing a group of endpoints. These are the registered
# paths, read off the application object rather than guessed from the prefixes.
REPRESENTATIVE_ROUTES = (
    "/api/youtube/metadata",
    "/api/generate",
    "/api/content/",
    "/api/folders/",
)


def registered_paths() -> set[str]:
    """Every path the application object currently exposes."""
    from app.main import app

    return {getattr(route, "path", None) for route in app.routes}


def test_app_imports() -> None:
    """The FastAPI application object can be built."""
    from app.main import app

    assert app.title == "XtractNote API"


def test_health_route_is_registered() -> None:
    """
    The health endpoint is mounted.

    It is the one route a deployment platform calls to decide whether the
    service is alive, so losing it would stay invisible until a host marked the
    backend unhealthy.
    """
    assert "/api/health" in registered_paths()


def test_every_router_is_registered() -> None:
    """
    All four routers reached the application.

    Importing `app.main` proves they *import*; it does not prove they are still
    registered, because deleting an `include_router` call leaves the import
    working and the endpoints gone. This is the assertion that covers that.
    """
    paths = registered_paths()
    missing = [route for route in REPRESENTATIVE_ROUTES if route not in paths]
    assert not missing, f"routers no longer registered: {missing}"


def test_supabase_module_imports() -> None:
    """
    The Supabase client module imports on its own.

    It needs its own test because the application's import chain does not reach
    it, as the module docstring above explains. Importing it here does not build
    a client or open a connection — `get_supabase_client` does that on first
    call — so this checks importability and nothing else.

    It is worth checking now because the job-record work is what will first
    import this module in earnest.
    """
    from app.db.supabase import get_supabase_client

    assert callable(get_supabase_client)
