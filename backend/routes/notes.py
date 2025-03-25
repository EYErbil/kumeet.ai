from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
from services.notes_service import NotesService
from routes.auth import get_current_user

# Set up logger
logger = logging.getLogger(__name__)

router = APIRouter(tags=["notes"])


class NoteCreate(BaseModel):
    meetingId: str
    content: str
    meetingTitle: Optional[str] = None
    meetingDate: Optional[str] = None


class NoteUpdate(BaseModel):
    content: str
    meetingTitle: Optional[str] = None
    meetingDate: Optional[str] = None


@router.get("/meeting/{meeting_id}")
async def get_notes_for_meeting(meeting_id: int):
    """Get all notes for a specific meeting"""
    try:
        notes = NotesService.get_notes_for_meeting(meeting_id)
        return {"notes": notes}
    except Exception as e:
        logger.error(f"Error in get_notes_for_meeting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def create_note(note: NoteCreate, current_user: dict = Depends(get_current_user)):
    """Create a new note"""
    try:
        # Add current user's ID to note data
        note_data = note.dict()
        note_data["createdBy"] = {"id": current_user.get("uid"), "name": "Current User"}

        created_note = NotesService.create_note(note_data)
        return created_note
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in create_note: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{note_id}")
async def update_note(note_id: int, note: NoteUpdate, current_user: dict = Depends(get_current_user)):
    """Update an existing note"""
    try:
        updated_note = NotesService.update_note(note_id, note.dict())
        return updated_note
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in update_note: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{note_id}")
async def delete_note(note_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a note"""
    try:
        success = NotesService.delete_note(note_id)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in delete_note: {e}")
        raise HTTPException(status_code=500, detail=str(e))