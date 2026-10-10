"""
The generation endpoints, through the real app.

The signed-in user, the generation pool and the job functions are stand-ins,
so no request reaches the database or a model, and no generation runs — a
started slot records the work it was given instead of running it. The app is
not entered as a context manager, so its lifespan (and the sweep) never runs.
"""

import json
from functools import partial
from typing import Any
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import CurrentUser, get_current_user
from app.main import app
from app.services import jobs
from app.services.dispatch import get_generation_pool
from app.services.generate import MAX_TRANSCRIPT_CHARS
from app.services.worker import GenerationInput, run_job

USER = "e6a969d8-0000-0000-0000-000000000001"
JOB = "11111111-2222-3333-4444-555555555555"

VALID = {
    "fullText": "A transcript about tides.",
    "contentType": "summary",
    "videoId": "dQw4w9WgXcQ",
    "title": "How tides work",
    "channel": "Ocean Notes",
    "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "durationSeconds": 754,
    "requestId": "9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f",
}
KEY = VALID["requestId"]


class FakeSlot:
    def __init__(self, starts: bool) -> None:
        self.starts = starts
        self.work: Any = None
        self.released = False

    def start(self, work: Any) -> bool:
        self.work = work
        return self.starts

    def release(self) -> None:
        self.released = True


class FakePool:
    def __init__(self, free: bool = True, starts: bool = True) -> None:
        self.free = free
        self.slot = FakeSlot(starts)
        self.reserved = 0

    def reserve(self) -> FakeSlot | None:
        self.reserved += 1
        return self.slot if self.free else None


class FakeJobs:
    """Records calls to the job functions the routes use."""

    def __init__(self) -> None:
        self.created: list[tuple[str, str, str, str]] = []
        self.failed: list[tuple[str, str, str, str]] = []
        self.read: list[tuple[str, str]] = []
        self.looked_up: list[tuple[str, str]] = []
        self.create_raises: Exception | None = None
        self.get_result: Any = None
        self.get_raises: Exception | None = None
        # What find_job_for_request answers, in order: one entry per call.
        self.existing: list[Any] = []
        self.find_raises: Exception | None = None

    def create_job(self, user_id: str, video_id: str, content_type: str, request_id: str) -> str:
        self.created.append((user_id, video_id, content_type, request_id))
        if self.create_raises:
            raise self.create_raises
        return JOB

    def find_job_for_request(self, user_id: str, request_id: str) -> Any:
        self.looked_up.append((user_id, request_id))
        if self.find_raises:
            raise self.find_raises
        return self.existing.pop(0) if self.existing else None

    def fail(self, job_id: str, user_id: str, code: str, message: str) -> dict:
        self.failed.append((job_id, user_id, code, message))
        return {}

    def get_job(self, job_id: str, user_id: str) -> dict:
        self.read.append((job_id, user_id))
        if self.get_raises:
            raise self.get_raises
        return self.get_result


@pytest.fixture
def fake_jobs(monkeypatch: pytest.MonkeyPatch) -> FakeJobs:
    fake = FakeJobs()
    for name in ("create_job", "find_job_for_request", "fail", "get_job"):
        monkeypatch.setattr(jobs, name, getattr(fake, name))
    return fake


@pytest.fixture
def pool() -> FakePool:
    return FakePool()


@pytest.fixture
def client(pool: FakePool, fake_jobs: FakeJobs):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=USER)
    app.dependency_overrides[get_generation_pool] = lambda: pool
    yield TestClient(app)
    app.dependency_overrides.clear()


def post(client: TestClient, **changes: Any):
    body = {**VALID, **changes}
    body = {key: value for key, value in body.items() if value is not ...}
    return client.post("/api/generate", json=body)


def started(pool: FakePool) -> GenerationInput:
    """The GenerationInput the route handed to run_job."""
    work = pool.slot.work
    assert isinstance(work, partial) and work.func is run_job
    job_id, user_id, request = work.args
    assert (job_id, user_id) == (JOB, USER)
    return request


# --- Starting a generation ----------------------------------------------------


def test_a_valid_request_is_accepted_with_its_job_id(client, pool, fake_jobs) -> None:
    response = post(client)
    assert response.status_code == 202
    assert response.json() == {"jobId": JOB}
    assert fake_jobs.created == [(USER, "dQw4w9WgXcQ", "summary", KEY)]


def test_the_job_runs_for_the_signed_in_user(client, pool) -> None:
    post(client)
    request = started(pool)
    assert request.full_text == VALID["fullText"]
    assert request.content_type == "summary"


def test_a_user_named_in_the_body_is_ignored(client, fake_jobs) -> None:
    post(client, userId="someone-else", user_id="someone-else")
    assert fake_jobs.created[0][0] == USER


def test_the_watch_url_is_built_from_the_video_id(client, pool) -> None:
    post(client, videoUrl="javascript:alert(1)")
    video = started(pool).video
    assert video.url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    assert video.thumbnail_url == VALID["thumbnailUrl"]
    assert video.duration_seconds == 754


def test_a_stray_platform_on_a_non_social_type_is_cleared(client, pool) -> None:
    post(client, platform="linkedin")
    assert started(pool).platform is None


def test_social_carries_its_platform(client, pool) -> None:
    post(client, contentType="social", platform="x-thread")
    assert started(pool).platform == "x-thread"


def test_duration_is_optional(client, pool) -> None:
    assert post(client, durationSeconds=...).status_code == 202
    assert started(pool).video.duration_seconds is None


# --- Refused before any job exists --------------------------------------------


@pytest.mark.parametrize(
    ("changes", "code"),
    [
        ({"fullText": "   "}, "empty-transcript"),
        ({"fullText": "x" * (MAX_TRANSCRIPT_CHARS + 1)}, "transcript-too-long"),
    ],
)
def test_input_that_would_fail_is_a_coded_422(client, pool, fake_jobs, changes, code) -> None:
    response = post(client, **changes)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == code
    assert pool.reserved == 0 and fake_jobs.created == []


@pytest.mark.parametrize(
    "changes",
    [
        {"contentType": "poem"},
        {"contentType": "social"},
        {"videoId": "short"},
        {"videoId": "dQw4w9WgXcQ&x=1"},
        {"title": ""},
        {"title": "x" * 301},
        {"channel": "x" * 201},
        {"thumbnailUrl": "https://evil.example/thumb.jpg"},
        {"thumbnailUrl": "http://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"},
        {"thumbnailUrl": "javascript:alert(1)"},
        {"durationSeconds": -1},
        {"durationSeconds": 86_401},
    ],
)
def test_a_malformed_request_is_422_and_creates_no_job(client, pool, fake_jobs, changes) -> None:
    assert post(client, **changes).status_code == 422
    assert pool.reserved == 0 and fake_jobs.created == []


@pytest.mark.parametrize("value", [float("inf"), float("-inf"), float("nan")])
def test_a_non_finite_duration_is_422_not_500(client, fake_jobs, value: float) -> None:
    """
    `json.dumps` writes these as `Infinity` / `NaN`, which Python's parser
    accepts. FastAPI's own validation handler echoed the value back and could
    not serialise it, so this was once a 500.
    """
    response = client.post(
        "/api/generate",
        content=json.dumps({**VALID, "durationSeconds": value}),
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 422
    assert fake_jobs.created == []


def test_a_malformed_request_does_not_echo_what_it_sent(client) -> None:
    response = post(client, title="", channel="<script>hello</script>" * 20)
    assert response.status_code == 422
    assert "<script>" not in response.text
    assert all(set(error) == {"loc", "msg", "type"} for error in response.json()["detail"])


# --- The request key ----------------------------------------------------------

EARLIER = {"id": "77777777-0000-0000-0000-000000000007", "video_id": "dQw4w9WgXcQ",
           "content_type": "summary", "status": "drafting"}


@pytest.mark.parametrize("key", [..., "", "not-a-uuid", "1' OR '1'='1", "x" * 500])
def test_a_missing_or_malformed_key_is_422_before_any_lookup(client, pool, fake_jobs, key) -> None:
    assert post(client, requestId=key).status_code == 422
    assert fake_jobs.looked_up == [] and pool.reserved == 0 and fake_jobs.created == []


def test_the_key_is_looked_up_for_this_user_only(client, fake_jobs) -> None:
    post(client)
    assert fake_jobs.looked_up == [(USER, KEY)]


def test_a_repeated_start_returns_the_job_it_already_made(client, pool, fake_jobs) -> None:
    """The point of the key: no second job, no second slot, no second spend."""
    fake_jobs.existing = [EARLIER]
    response = post(client)
    assert response.status_code == 202
    assert response.json() == {"jobId": EARLIER["id"]}
    assert pool.reserved == 0 and fake_jobs.created == [] and pool.slot.work is None


def test_a_repeat_is_answered_even_when_the_pool_is_full(client, pool, fake_jobs) -> None:
    """The job already exists, so a busy pool is no reason to refuse the answer."""
    pool.free = False
    fake_jobs.existing = [EARLIER]
    assert post(client).json() == {"jobId": EARLIER["id"]}


@pytest.mark.parametrize("changes", [{"videoId": "aircAruvnKk"}, {"contentType": "blog"}])
def test_a_key_reused_for_a_different_request_is_409(client, pool, fake_jobs, changes) -> None:
    """Never answered with the earlier job: that would hand back an unrelated result."""
    fake_jobs.existing = [EARLIER]
    response = post(client, **changes)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "request-key-reused"
    assert EARLIER["id"] not in response.text
    assert pool.reserved == 0 and fake_jobs.created == []


def test_a_lost_race_gives_its_slot_back_and_returns_the_winner(client, pool, fake_jobs) -> None:
    """Two copies of one request: the database refuses the second insert."""
    fake_jobs.existing = [None, EARLIER]
    fake_jobs.create_raises = jobs.JobError("duplicate-request", "exists")
    response = post(client)
    assert response.status_code == 202
    assert response.json() == {"jobId": EARLIER["id"]}
    assert pool.slot.released is True and pool.slot.work is None


def test_a_lost_race_whose_winner_cannot_be_found_is_500(client, pool, fake_jobs) -> None:
    fake_jobs.existing = [None, None]
    fake_jobs.create_raises = jobs.JobError("duplicate-request", "exists")
    response = post(client)
    assert response.status_code == 500
    assert response.json()["detail"]["code"] == "job-not-created"
    assert pool.slot.released is True


def test_a_failed_lookup_starts_nothing(client, pool, fake_jobs) -> None:
    """Refused as not started, so the client may retry — with the same key, safely."""
    fake_jobs.find_raises = RuntimeError("database down")
    response = post(client)
    assert response.status_code == 500
    assert response.json()["detail"]["code"] == "job-not-created"
    assert pool.reserved == 0 and fake_jobs.created == []


# --- Busy, and failures after admission ---------------------------------------


def test_a_full_pool_is_503_busy_and_creates_no_job(client, pool, fake_jobs) -> None:
    pool.free = False
    response = post(client)
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "generation-busy"
    assert response.headers["retry-after"] == "30"
    assert fake_jobs.created == []


def test_a_job_that_cannot_be_created_gives_its_slot_back(client, pool, fake_jobs) -> None:
    fake_jobs.create_raises = RuntimeError("database down")
    response = post(client)
    assert response.status_code == 500
    assert response.json()["detail"]["code"] == "job-not-created"
    assert pool.slot.released is True
    assert pool.slot.work is None


def test_a_pool_that_closed_after_reserving_ends_the_job_at_once(client, pool, fake_jobs) -> None:
    pool.slot.starts = False
    response = post(client)
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "generation-busy"
    assert fake_jobs.failed == [(JOB, USER, "generation-busy", "The server was stopping.")]


def test_an_error_never_carries_internal_text(client, fake_jobs) -> None:
    fake_jobs.create_raises = RuntimeError("password=hunter2 at db.internal")
    assert "hunter2" not in post(client).text


# --- Reading a job ------------------------------------------------------------

ROW = {
    "id": JOB,
    "user_id": USER,
    "status": "failed",
    "progress": 0,
    "result_id": None,
    "error_code": "generation-failed",
    "error_message": "The openai request failed: secret provider detail",
    "created_at": "2026-10-09T12:00:00+00:00",
    "completed_at": "2026-10-09T12:01:00+00:00",
    "heartbeat_at": "2026-10-09T12:00:30+00:00",
}


def test_a_job_is_reported_to_its_owner(client, fake_jobs) -> None:
    fake_jobs.get_result = ROW
    response = client.get(f"/api/generate/jobs/{JOB}")
    assert response.status_code == 200
    assert response.json() == {
        "jobId": JOB,
        "status": "failed",
        "progress": 0,
        "resultId": None,
        "errorCode": "generation-failed",
        "createdAt": "2026-10-09T12:00:00+00:00",
        "completedAt": "2026-10-09T12:01:00+00:00",
    }
    assert fake_jobs.read == [(JOB, USER)]


def test_the_error_message_is_never_returned(client, fake_jobs) -> None:
    fake_jobs.get_result = ROW
    assert "secret provider detail" not in client.get(f"/api/generate/jobs/{JOB}").text


def test_a_missing_or_foreign_job_is_404(client, fake_jobs) -> None:
    fake_jobs.get_raises = jobs.JobError("job-not-found", "That job does not exist.")
    response = client.get(f"/api/generate/jobs/{JOB}")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "job-not-found"


def test_a_job_id_that_is_not_a_uuid_is_422_without_a_lookup(client, fake_jobs) -> None:
    assert client.get("/api/generate/jobs/not-a-uuid").status_code == 422
    assert fake_jobs.read == []


def test_a_failed_lookup_is_503(client, fake_jobs) -> None:
    fake_jobs.get_raises = RuntimeError("network")
    assert client.get(f"/api/generate/jobs/{JOB}").json()["detail"]["code"] == "job-status-unavailable"


def test_the_job_id_is_looked_up_in_canonical_form(client, fake_jobs) -> None:
    fake_jobs.get_result = ROW
    client.get(f"/api/generate/jobs/{JOB.upper()}")
    assert fake_jobs.read == [(str(UUID(JOB)), USER)]


# --- Without a signed-in user -------------------------------------------------


def test_both_routes_refuse_an_unauthenticated_caller(pool: FakePool, fake_jobs: FakeJobs) -> None:
    """The real auth dependency, with no token: nothing reaches the pool or the jobs."""
    app.dependency_overrides[get_generation_pool] = lambda: pool
    try:
        anonymous = TestClient(app)
        assert anonymous.post("/api/generate", json=VALID).status_code == 401
        assert anonymous.get(f"/api/generate/jobs/{JOB}").status_code == 401
    finally:
        app.dependency_overrides.clear()
    assert pool.reserved == 0 and fake_jobs.created == [] and fake_jobs.read == []
