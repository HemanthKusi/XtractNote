"""
backend/app/api/generate.py

Content generation endpoint:
  - POST /api/generate  -> generates Markdown content from a transcript

The route prefix "/api/generate" is added in main.py via include_router,
so here we declare the path relative to that (an empty "" = the prefix root).

This is the synchronous MVP: the request blocks until the AI returns, and the
generated content comes back in the response body. There is no job record or
status polling yet — that arrives in Phase 8 with the database, when long jobs
move to async + a generation_jobs table.
"""

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.services.prompts import ContentType
from app.services.generate import GenerationError, generate_content

router = APIRouter()


# ── Request / Response shapes ────────────────────────────────
class GenerateRequest(BaseModel):
    # camelCase to match what the frontend sends, same contract style as the
    # YouTube endpoints. `contentType` is typed as the ContentType literal so
    # Pydantic rejects anything outside summary|blog|notes with a 422 before
    # our code — or any paid AI call — runs.
    fullText: str
    contentType: ContentType


class GenerateResponse(BaseModel):
    # Echo the type back so the response is self-describing, plus the result.
    contentType: ContentType
    content: str


# ── Error mapping ────────────────────────────────────────────
# Each GenerationError.code (from the service layer) maps to an HTTP status.
# Input problems are the client's fault (422), a missing key is ours (500),
# and an upstream provider failure is a bad gateway (502). The code flows
# through to the frontend as structured detail so the UI picks the right copy.
_GENERATE_ERROR_STATUS = {
    "empty-transcript": 422,
    "transcript-too-long": 422,
    "unknown-content-type": 422,
    "provider-misconfigured": 500,
    "generation-failed": 502,
}


# ── Generate endpoint ────────────────────────────────────────
@router.post("", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    # generate_content() is BLOCKING — the LangChain .invoke() call waits on
    # the network. Running it directly in an async route would freeze the event
    # loop; run_in_threadpool runs it on a worker thread so the server stays
    # responsive (same reason the transcript endpoint uses it).
    try:
        content = await run_in_threadpool(
            generate_content, req.fullText, req.contentType
        )
    except GenerationError as exc:
        # Known, typed failure: translate the code into an HTTP status and pass
        # the code through as structured detail, exactly like the transcript
        # endpoint, so the frontend client reads detail.code the same way.
        status = _GENERATE_ERROR_STATUS.get(exc.code, 502)
        raise HTTPException(
            status_code=status,
            detail={"code": exc.code, "message": str(exc)},
        )

    return GenerateResponse(contentType=req.contentType, content=content)