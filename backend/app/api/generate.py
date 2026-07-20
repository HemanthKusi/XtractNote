"""
backend/app/api/generate.py

Content generation endpoint:
  - POST /api/generate  -> generates content from a transcript

The route prefix "/api/generate" is added in main.py via include_router,
so here we declare the path relative to that (an empty "" = the prefix root).

This is the synchronous MVP: the request blocks until the AI returns, and the
generated content comes back in the response body. There is no job record or
status polling yet — that arrives later, when long jobs move to async + a
generation_jobs table.

The response `content` field carries the content BODY built by the service,
not a plain string:
  - prose types (summary, blog, notes, research, social) -> {"markdown": ...}
  - flashcards -> {"kind": "flashcards", "cards": [...]}
  - quiz       -> {"kind": "quiz", "questions": [...]}

The body shape is validated in the service layer (generate.py), which owns it
as a storage contract. This layer stays transport-only and passes it through.
"""

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, model_validator

from app.services.prompts import ContentType, SocialPlatform
from app.services.generate import GenerationError, generate_content

router = APIRouter()


# ── Request / Response shapes ────────────────────────────────
class GenerateRequest(BaseModel):
    # camelCase to match what the frontend sends, same contract style as the
    # YouTube endpoints. `contentType` is typed as the ContentType literal, so
    # Pydantic validates against the full seven-type union and rejects anything
    # else with a 422 before our code — or any paid AI call — runs.
    #
    # Note this validates against the type union itself, NOT against
    # SYSTEM_PROMPTS.keys(): social lives in SOCIAL_PROMPTS by design, so
    # validating off the dict keys would wrongly reject it.
    fullText: str
    contentType: ContentType
    # Required only when contentType == "social"; selects which platform prompt
    # to use. Ignored (and cleared) for every other type.
    platform: SocialPlatform | None = None

    @model_validator(mode="after")
    def check_platform(self) -> "GenerateRequest":
        """
        Enforce the platform rule at the request boundary.

        A social request without a platform is a malformed request, so it
        deserves a 422 rather than travelling into the service and coming back
        as a generation error. Validating here also means we fail before any
        thread dispatch or paid provider call.
        """
        if self.contentType == "social":
            if self.platform is None:
                raise ValueError("platform is required when contentType is 'social'")
        else:
            # Clear a stray platform on non-social requests so the response
            # echo can't imply it influenced the result.
            self.platform = None
        return self


class GenerateResponse(BaseModel):
    # Echo the request back so the response is self-describing, plus the result.
    contentType: ContentType
    # None for every type except social.
    platform: SocialPlatform | None = None
    # The content body dict. Left loose on purpose: the three shapes are
    # already validated in the service layer, and re-declaring them here would
    # duplicate the contract in two places that must then move together.
    content: dict[str, Any]


# ── Error mapping ────────────────────────────────────────────
# Each GenerationError.code (from the service layer) maps to an HTTP status.
# Input problems are the client's fault (422), a missing key is ours (500),
# and an upstream provider failure is a bad gateway (502). The code flows
# through to the frontend as structured detail so the UI picks the right copy.
#
# "invalid-structured-output" is a 502, not a 4xx: the request was valid and
# the model returned unusable JSON, which is an upstream failure. It is also
# the retryable case — regenerating may well succeed.
_GENERATE_ERROR_STATUS = {
    "empty-transcript": 422,
    "transcript-too-long": 422,
    "unknown-content-type": 422,
    "provider-misconfigured": 500,
    "generation-failed": 502,
    "invalid-structured-output": 502,
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
            generate_content, req.fullText, req.contentType, req.platform
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

    return GenerateResponse(
        contentType=req.contentType,
        platform=req.platform,
        content=content,
    )