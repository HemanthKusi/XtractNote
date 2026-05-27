"""
XtractNote — Content API Routes

CRUD operations for saved generated content.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_content():
    """List user's saved content with optional filters."""
    return {"message": "Content list endpoint — coming in Phase 8"}


@router.post("/")
async def save_content():
    """Save newly generated content."""
    return {"message": "Content save endpoint — coming in Phase 8"}


@router.get("/{content_id}")
async def get_content(content_id: str):
    """Get a single content item."""
    return {"message": f"Content {content_id} — coming in Phase 8"}


@router.patch("/{content_id}")
async def update_content(content_id: str):
    """Update content (edit, rename, move folder, change status)."""
    return {"message": f"Update content {content_id} — coming in Phase 8"}


@router.delete("/{content_id}")
async def delete_content(content_id: str):
    """Delete a content item."""
    return {"message": f"Delete content {content_id} — coming in Phase 8"}
