from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
from .auth import get_current_user
from services.notes_service import NotesService
from config.settings import settings
from db import get_db_connection

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


@router.get("")
async def get_notes(
    meeting_id: Optional[int] = Query(None, description="Filter notes by meeting ID"),
    limit: int = Query(10, description="Maximum number of notes to return"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get notes with optional filtering by meeting_id
    """
    try:
        logger.info("GET /notes endpoint called")

        # Try to get user from auth, but don't require it
        user_id = None
        try:
            # Current_user is now a string directly containing the user ID
            user_id = current_user
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
        # Current_user is now a string containing the user ID directly
        user_id = current_user
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
@router.post("")
async def create_note(note: NoteCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new note
    """
    try:
        # Current_user is now a string containing the user ID directly
        user_id = current_user
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


@router.get("/debug")
async def debug_notes():
    """
    Get all notes for debugging purposes (development only)
    """
    if not settings.DEBUG:
        return {"error": "Debug endpoints only available in development mode"}
    
    try:
        # Get all notes from database
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        n.note_id, n.firebase_uid, n.meeting_id, 
                        n.content, n.created_at, n.updated_at,
                        u.first_name, u.last_name, u.email,
                        m.title AS meeting_title
                    FROM notes n
                    LEFT JOIN users u ON n.firebase_uid = u.firebase_uid
                    LEFT JOIN meetings m ON n.meeting_id = m.meeting_id
                    ORDER BY n.created_at DESC
                """)
                notes = []
                rows = cur.fetchall()
                
                for row in cur.fetchall():
                    note = {
                        "id": row[0],
                        "user_id": row[1],
                        "meeting_id": row[2],
                        "content": row[3],
                        "created_at": row[4].isoformat() if row[4] else None,
                        "updated_at": row[5].isoformat() if row[5] else None,
                        "user_name": f"{row[6]} {row[7]}",
                        "user_email": row[8],
                        "meeting_title": row[9]
                    }
                    notes.append(note)
                
                return {"notes": notes}
                
    except Exception as e:
        logger.error(f"Error in debug_notes: {str(e)}")
        return {"error": str(e)}