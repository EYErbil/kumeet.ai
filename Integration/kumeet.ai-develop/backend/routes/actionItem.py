from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date
import logging
from .auth import get_current_user
from services.actionItems_service import ActionItemsService
from db import get_db_connection

# Set up logger
logger = logging.getLogger(__name__)

router = APIRouter(tags=["action-items"])

class ActionItemCreate(BaseModel):
    description: str
    meeting_id: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = 'pending'


class ActionItemUpdate(BaseModel):
    description: Optional[str] = None
    meeting_id: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None



@router.get("/all")
async def get_action_items_for_user(
        limit: int = Query(50, description="Maximum number of items to return"),
        current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get action items for the current authenticated user"""
    try:
        user_id = current_user.get("uid")
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")

        logger.info(f"Getting action items for user ID: {user_id}")
        action_items = ActionItemsService.get_all_action_items(user_id, limit)
        return {"action_items": action_items}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_action_items_for_user: {e}")
        return {"action_items": []}


@router.get("/meeting/{meeting_id}")
async def get_action_items_for_meeting(
        meeting_id: int,
        limit: int = Query(50, description="Maximum number of items to return")
):
    """Get action items for a specific meeting"""
    try:
        logger.info(f"Getting action items for meeting ID: {meeting_id}")
        action_items = ActionItemsService.get_action_items_for_meeting(meeting_id, limit)
        return {"action_items": action_items}
    except Exception as e:
        logger.error(f"Error in get_action_items_for_meeting: {e}")
        return {"action_items": []}


@router.post("")
async def create_action_item(
        item: ActionItemCreate,
        current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new action item"""
    try:
        user_id = current_user.get("uid")
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")

        # Map frontend fields to backend fields
        item_data = {
            "firebase_uid": user_id,
            "meeting_id": item.meeting_id if hasattr(item, 'meeting_id') else None,
            "description": item.description,
            "due_date": item.due_date,
            "status": item.status
        }

        logger.info(f"Creating action item: {item_data}")
        created_item = ActionItemsService.create_action_item(item_data)
        logger.info(f"Created action item with ID: {created_item['id']}")
        return created_item
    except ValueError as e:
        logger.error(f"Value error in create_action_item: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in create_action_item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{item_id}")
async def update_action_item(
        item_id: int,
        item: ActionItemUpdate,
        current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing action item"""
    try:
        # Map frontend fields to backend fields
        item_data = {}

        if item.description is not None:
            item_data["description"] = item.description

        if item.meeting_id is not None:
            item_data["meeting_id"] = item.meeting_id

        if item.due_date is not None:
            item_data["due_date"] = item.due_date

        if item.status is not None:
            item_data["status"] = item.status

        logger.info(f"Updating action item {item_id}: {item_data}")
        updated_item = ActionItemsService.update_action_item(item_id, item_data)
        logger.info(f"Updated action item {item_id}")
        return updated_item
    except ValueError as e:
        logger.error(f"Value error in update_action_item: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in update_action_item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{item_id}")
async def delete_action_item(
        item_id: int,
        current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete an action item"""
    try:
        logger.info(f"Deleting action item {item_id}")
        success = ActionItemsService.delete_action_item(item_id)
        logger.info(f"Deleted action item {item_id}")
        return {"success": success}
    except ValueError as e:
        logger.error(f"Value error in delete_action_item: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in delete_action_item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Debug endpoint to help with troubleshooting
@router.get("/debug")
async def debug_action_items():
    """Debug endpoint for action items"""
    try:
        # Get all action items directly from the database without filtering
        all_items = ActionItemsService.get_all_action_items(user_id=None, limit=100)

        # Basic DB stats
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM action_items")
                count = cur.fetchone()[0]

                cur.execute("SELECT COUNT(DISTINCT firebase_uid) FROM action_items")
                user_count = cur.fetchone()[0]

                cur.execute("SELECT COUNT(DISTINCT meeting_id) FROM action_items")
                meeting_count = cur.fetchone()[0]

        return {
            "total_count": count,
            "user_count": user_count,
            "meeting_count": meeting_count,
            "sample_items": all_items[:5] if all_items else []
        }
    except Exception as e:
        logger.error(f"Error in debug_action_items: {e}")
        return {"error": str(e)}


@router.get("/count/pending")
async def get_pending_action_items_count(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get count of pending action items for the current authenticated user"""
    try:
        user_id = current_user.get("uid")
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")

        logger.info(f"Getting pending action items count for user ID: {user_id}")
        count = ActionItemsService.count_pending_action_items(user_id)
        return {"count": count}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_pending_action_items_count: {e}")
        return {"count": 0}