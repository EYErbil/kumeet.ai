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
        # Current_user is now a string containing the user ID directly, not a dictionary
        user_id = current_user
        
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
        # Current_user is now a string containing the user ID directly, not a dictionary
        user_id = current_user
        
        if not user_id:
            logger.error("Authentication required - user_id is None")
            raise HTTPException(status_code=401, detail="Authentication required")
        # Map frontend fields to backend fields
        item_data = {
            "firebase_uid": user_id,
            "description": item.description,
            "due_date": item.due_date,
            "status": item.status
        }
        
        # Handle meeting_id - convert to int if it's a valid number, otherwise set to None
        if hasattr(item, 'meeting_id') and item.meeting_id:
            try:
                item_data["meeting_id"] = int(item.meeting_id)
            except (ValueError, TypeError):
                # If the meeting_id can't be converted to int, set it to None
                item_data["meeting_id"] = None
        else:
            item_data["meeting_id"] = None

        
        # Wrap the service call in a try-except to isolate any service errors
        try:
            created_item = ActionItemsService.create_action_item(item_data)
        except Exception as service_error:
            raise HTTPException(status_code=500, detail=f"Failed to create action item: {str(service_error)}")
        
        # Make sure created_item is not None
        if not created_item:
            raise HTTPException(status_code=500, detail="Failed to create action item, service returned None")
        
        # Safely log the item ID - check that created_item is actually a dict first
        if not isinstance(created_item, dict):
            raise HTTPException(status_code=500, detail=f"Invalid response from service: expected dict, got {type(created_item)}")
            
        item_id = created_item.get('id', 'unknown')
            
        return created_item
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
        # Re-raise HTTP exceptions to preserve status codes and details
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{item_id}")
async def update_action_item(
        item_id: int,
        item: ActionItemUpdate,
        current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing action item"""
    try:
        item_data = {}

        if item.description is not None:
            item_data["description"] = item.description

        if item.meeting_id is not None:
            item_data["meeting_id"] = item.meeting_id

        if item.due_date is not None:
            item_data["due_date"] = item.due_date

        if item.status is not None:
            item_data["status"] = item.status

        updated_item = ActionItemsService.update_action_item(item_id, item_data)
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
        success = ActionItemsService.delete_action_item(item_id)
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
        user_id = current_user
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        count = ActionItemsService.count_pending_action_items(user_id)
        return {"count": count}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_pending_action_items_count: {e}")
        return {"count": 0}