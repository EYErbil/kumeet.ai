from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
import logging
from .auth import get_current_user
from services.notes_service import NotesService

# Set up logger
logger = logging.getLogger(__name__)

router = APIRouter(tags=["notes"])


class NoteCreate(BaseModel):
    meetingId: Optional[str] = None
    content: str
    meetingTitle: Optional[str] = None
    meetingDate: Optional[str] = None


class NoteUpdate(BaseModel):
    content: str
    meetingTitle: Optional[str] = None
    meetingDate: Optional[str] = None
    meetingId: Optional[str] = None


@router.get("/")
async def get_all_notes(request: Request):
    """
    Get all notes for the current user or all notes if no user is authenticated
    This is a more permissive endpoint that works with or without authentication
    """
    try:
        logger.info("GET /notes endpoint called")

        # Try to get user from auth, but don't require it
        user_id = None
        try:
            # Get the authorization header
            auth_header = request.headers.get('Authorization')
            logger.debug(f"Auth header: {auth_header}")

            if auth_header and auth_header.startswith('Bearer '):
                # Process the token and get the user
                token = auth_header.replace('Bearer ', '')
                user = await get_current_user(token)
                user_id = user.get("uid")
                logger.info(f"Authenticated user: {user_id}")
        except Exception as auth_err:
            logger.warning(f"Authentication error but continuing: {auth_err}")

        # Get notes, with or without user filter
        notes = NotesService.get_all_notes(user_id)
        logger.info(f"Returning {len(notes)} notes")

        # Return notes in the expected format
        return {"notes": notes}
    except Exception as e:
        logger.error(f"Error in get_all_notes: {e}")
        # Return empty array instead of error to avoid breaking frontend
        return {"notes": []}


@router.get("/all")
async def get_all_notes_all_meetings(current_user: dict = Depends(get_current_user)):
    """Get all notes for all meetings for the current user"""
    try:
        user_id = current_user.get("uid")
        logger.info(f"GET /notes/all endpoint called for user: {user_id}")

        if not user_id:
            logger.error("No user ID in token")
            # Continue without user filter to show all notes

        notes = NotesService.get_all_notes(user_id)
        logger.info(f"Returning {len(notes)} notes from /notes/all")

        return {"notes": notes}
    except Exception as e:
        logger.error(f"Error in get_all_notes_all_meetings: {e}")
        # Return empty array instead of error to avoid breaking frontend
        return {"notes": []}


@router.get("/meeting/{meeting_id}")
async def get_notes_for_meeting(meeting_id: int):
    """Get all notes for a specific meeting"""
    try:
        logger.info(f"Getting notes for meeting ID: {meeting_id}")
        notes = NotesService.get_notes_for_meeting(meeting_id)
        return {"notes": notes}
    except Exception as e:
        logger.error(f"Error in get_notes_for_meeting: {e}")
        return {"notes": []}


# The rest of your route handlers remain the same...
@router.post("/")
async def create_note(note: NoteCreate, current_user: dict = Depends(get_current_user)):
    """Create a new note"""
    try:
        user_id = current_user.get("uid")
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")

        # Map frontend fields to backend fields
        note_data = {
            "firebase_uid": user_id,
            "meeting_id": int(note.meetingId) if note.meetingId else None,
            "content": note.content,
            "meetingTitle": note.meetingTitle,
            "meetingDate": note.meetingDate
        }

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
        # Map frontend fields to backend fields
        note_data = {
            "content": note.content,
            "meetingTitle": note.meetingTitle,
            "meetingDate": note.meetingDate,
            "meeting_id": note.meetingId
        }

        updated_note = NotesService.update_note(note_id, note_data)
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