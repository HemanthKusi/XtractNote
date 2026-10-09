"""
`get_current_user`: who a request is, or why it is refused.

The Supabase client is replaced with a stand-in, so no token is sent anywhere.
What these prove is the mapping — which outcome becomes which status and code —
not that Supabase verifies tokens correctly.
"""

from dataclasses import dataclass
from typing import Any

import pytest
from fastapi import HTTPException
from gotrue.errors import AuthApiError, AuthRetryableError

from app.api import dependencies
from app.api.dependencies import CurrentUser, get_current_user

USER_ID = "e6a969d8-0000-0000-0000-000000000001"


@dataclass
class FakeUser:
    id: str | None


@dataclass
class FakeResponse:
    user: FakeUser | None


class FakeAuth:
    def __init__(self, result: Any = None, raises: Exception | None = None) -> None:
        self.result = result
        self.raises = raises
        self.tokens: list[str] = []

    def get_user(self, token: str) -> Any:
        self.tokens.append(token)
        if self.raises:
            raise self.raises
        return self.result


class FakeClient:
    def __init__(self, auth: FakeAuth) -> None:
        self.auth = auth


def use(monkeypatch: pytest.MonkeyPatch, auth: FakeAuth) -> FakeAuth:
    monkeypatch.setattr(dependencies, "get_supabase_client", lambda: FakeClient(auth))
    return auth


def refusal(header: str | None) -> HTTPException:
    with pytest.raises(HTTPException) as caught:
        get_current_user(header)
    return caught.value


# --- A verified user ----------------------------------------------------------


def test_a_valid_token_returns_its_user(monkeypatch: pytest.MonkeyPatch) -> None:
    auth = use(monkeypatch, FakeAuth(FakeResponse(FakeUser(USER_ID))))
    assert get_current_user("Bearer good-token") == CurrentUser(id=USER_ID)
    assert auth.tokens == ["good-token"]


def test_surrounding_whitespace_is_not_part_of_the_token(monkeypatch: pytest.MonkeyPatch) -> None:
    auth = use(monkeypatch, FakeAuth(FakeResponse(FakeUser(USER_ID))))
    get_current_user("Bearer   good-token  ")
    assert auth.tokens == ["good-token"]


# --- Refused before Supabase is asked -----------------------------------------


@pytest.mark.parametrize("header", [None, "", "good-token", "Basic abc", "bearer good-token"])
def test_a_missing_or_malformed_header_is_401(
    monkeypatch: pytest.MonkeyPatch, header: str | None
) -> None:
    auth = use(monkeypatch, FakeAuth(FakeResponse(FakeUser(USER_ID))))
    error = refusal(header)
    assert error.status_code == 401
    assert error.detail["code"] == "not-authenticated"
    assert auth.tokens == []


@pytest.mark.parametrize("header", ["Bearer ", "Bearer    "])
def test_an_empty_token_is_never_passed_on(
    monkeypatch: pytest.MonkeyPatch, header: str
) -> None:
    """Given no token, `get_user` falls back to the client's stored session."""
    auth = use(monkeypatch, FakeAuth(FakeResponse(FakeUser(USER_ID))))
    assert refusal(header).status_code == 401
    assert auth.tokens == []


def test_a_401_tells_the_client_how_to_authenticate(monkeypatch: pytest.MonkeyPatch) -> None:
    use(monkeypatch, FakeAuth())
    assert refusal(None).headers == {"WWW-Authenticate": "Bearer"}


# --- What Supabase said -------------------------------------------------------


def test_a_token_supabase_rejects_is_401(monkeypatch: pytest.MonkeyPatch) -> None:
    use(monkeypatch, FakeAuth(raises=AuthApiError("invalid JWT", 401, "bad_jwt")))
    error = refusal("Bearer expired")
    assert error.status_code == 401
    assert error.detail["code"] == "not-authenticated"


def test_supabase_unreachable_is_503_not_401(monkeypatch: pytest.MonkeyPatch) -> None:
    """Signing in again would not help, so the user is not sent to sign in."""
    use(monkeypatch, FakeAuth(raises=AuthRetryableError("connection refused", 0)))
    error = refusal("Bearer good-token")
    assert error.status_code == 503
    assert error.detail["code"] == "auth-unavailable"
    assert error.headers is None


def test_an_unexpected_failure_is_503(monkeypatch: pytest.MonkeyPatch) -> None:
    use(monkeypatch, FakeAuth(raises=RuntimeError("something odd")))
    assert refusal("Bearer good-token").detail["code"] == "auth-unavailable"


@pytest.mark.parametrize(
    "result", [None, FakeResponse(None), FakeResponse(FakeUser(None)), FakeResponse(FakeUser(""))]
)
def test_an_answer_with_no_user_is_401(monkeypatch: pytest.MonkeyPatch, result: Any) -> None:
    use(monkeypatch, FakeAuth(result))
    assert refusal("Bearer good-token").status_code == 401


# --- What a refusal never carries ---------------------------------------------


def test_a_refusal_never_carries_the_underlying_error_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    use(monkeypatch, FakeAuth(raises=AuthApiError("internal detail xyz", 401, None)))
    assert "internal detail xyz" not in str(refusal("Bearer t").detail)


def test_get_current_user_is_a_plain_function() -> None:
    """An `async def` here would block the event loop on Supabase's network call."""
    import inspect

    assert not inspect.iscoroutinefunction(get_current_user)
