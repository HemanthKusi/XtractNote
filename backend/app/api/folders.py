"""
XtractNote — Folders API Routes

CRUD operations for user folders.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_folders():
    """List user's folders."""
    return {"message": "Folders list endpoint — coming in Phase 8"}


@router.post("/")
async def create_folder():
    """Create a new folder."""
    return {"message": "Create folder endpoint — coming in Phase 8"}


@router.patch("/{folder_id}")
async def update_folder(folder_id: str):
    """Update folder name, color, or emoji."""
    return {"message": f"Update folder {folder_id} — coming in Phase 8"}


@router.delete("/{folder_id}")
async def delete_folder(folder_id: str):
    """Delete a folder. Contents become unfiled."""
    return {"message": f"Delete folder {folder_id} — coming in Phase 8"}
