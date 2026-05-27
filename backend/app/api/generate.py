"""
XtractNote — Generate API Routes

Starts the LangGraph generation pipeline and provides
job status polling for the frontend progress screen.
"""

from fastapi import APIRouter

router = APIRouter()


@router.post("/")
async def start_generation():
    """Start a new content generation job via the LangGraph pipeline."""
    return {"message": "Generate endpoint — coming in Phase 7"}


@router.get("/{job_id}")
async def get_job_status(job_id: str):
    """Poll the status of a generation job."""
    return {"message": f"Job status for {job_id} — coming in Phase 7"}
