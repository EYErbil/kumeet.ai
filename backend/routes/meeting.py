from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import logging
from services.meeting_service import MeetingService

# Set up logger
logger = logging.getLogger(__name__)

router = APIRouter(tags=["meetings"])


# Pydantic models for request/response
class MeetingBase(BaseModel):
    title: str
    description: Optional[str] = None
    meeting_type: Optional[str] = "general"
    meeting_date: Optional[datetime] = None
    duration_seconds: Optional[int] = 3600


class MeetingCreate(MeetingBase):
    pass


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    meeting_type: Optional[str] = None
    meeting_date: Optional[datetime] = None
    duration_seconds: Optional[int] = None


class ActionItemBase(BaseModel):
    description: str
    due_date: Optional[datetime] = None
    status: Optional[str] = "pending"


class ActionItemCreate(ActionItemBase):
    pass


@router.get("/")
async def get_meetings(
        limit: int = Query(50, description="Number of meetings to return"),
        offset: int = Query(0, description="Offset for pagination")
):
    """Get all meetings"""
    try:
        meetings = MeetingService.get_meetings(limit=limit, offset=offset)
        return {"meetings": meetings}
    except Exception as e:
        logger.error(f"Error in get_meetings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def get_recent_meetings(
        limit: int = Query(5, description="Number of meetings to return")
):
    """Get recent meetings"""
    try:
        meetings = MeetingService.get_recent_meetings(limit=limit)
        return {"meetings": meetings}
    except Exception as e:
        logger.error(f"Error in get_recent_meetings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming")
async def get_upcoming_meetings(
        limit: int = Query(5, description="Number of meetings to return")
):
    """Get upcoming meetings"""
    try:
        # For now, just return recent meetings (we can implement specific upcoming logic later)
        meetings = MeetingService.get_recent_meetings(limit=limit)
        return {"meetings": meetings}
    except Exception as e:
        logger.error(f"Error in get_upcoming_meetings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/today")
async def get_today_meetings():
    """Get today's meetings"""
    try:
        meetings = MeetingService.get_today_meetings()
        return {"meetings": meetings}
    except Exception as e:
        logger.error(f"Error in get_today_meetings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: int):
    """Get a specific meeting by ID"""
    try:
        meeting = MeetingService.get_meeting_by_id(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return meeting
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_meeting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/action-items/all")
async def get_all_action_items(
        limit: int = Query(10, description="Number of action items to return")
):
    """Get all action items"""
    try:
        action_items = MeetingService.get_action_items(limit=limit)
        return {"action_items": action_items}
    except Exception as e:
        logger.error(f"Error in get_all_action_items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{meeting_id}/action-items")
async def get_meeting_action_items(meeting_id: int):
    """Get action items for a specific meeting"""
    try:
        # Check if meeting exists
        meeting = MeetingService.get_meeting_by_id(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        action_items = MeetingService.get_action_items(meeting_id=meeting_id)
        return {"action_items": action_items}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_meeting_action_items: {e}")
        raise HTTPException(status_code=500, detail=str(e))