from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, UploadFile, File, Form, Request
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import logging
import os
from pathlib import Path
from services.meeting_service import MeetingService
from services.actionItems_service import ActionItemsService
from services.summarization_service import SummarizationService
from utils.api_responses import success_response, error_response, not_found_response
from config.settings import settings
from .auth import get_current_user, get_optional_current_user

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


class ActionItemUpdate(BaseModel):
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str


@router.get("/")
async def get_meetings(
        limit: int = Query(50, description="Number of meetings to return"),
        offset: int = Query(0, description="Offset for pagination")
):
    """Get all meetings"""
    try:
        meetings = MeetingService.get_meetings(limit=limit, offset=offset)
        return success_response({"meetings": meetings})
    except Exception as e:
        logger.error(f"Error in get_meetings: {e}")
        return error_response(str(e))


@router.get("/recent")
async def get_recent_meetings(
        limit: int = Query(5, description="Number of meetings to return")
):
    """Get recent meetings"""
    try:
        meetings = MeetingService.get_recent_meetings(limit=limit)
        return success_response({"meetings": meetings})
    except Exception as e:
        logger.error(f"Error in get_recent_meetings: {e}")
        return error_response(str(e))


@router.get("/upcoming")
async def get_upcoming_meetings(
        limit: int = Query(5, description="Number of meetings to return")
):
    """Get upcoming meetings"""
    try:
        # For now, just return recent meetings (we can implement specific upcoming logic later)
        meetings = MeetingService.get_recent_meetings(limit=limit)
        return success_response({"meetings": meetings})
    except Exception as e:
        logger.error(f"Error in get_upcoming_meetings: {e}")
        return error_response(str(e))


@router.get("/today")
async def get_today_meetings():
    """Get today's meetings"""
    try:
        meetings = MeetingService.get_today_meetings()
        return success_response({"meetings": meetings})
    except Exception as e:
        logger.error(f"Error in get_today_meetings: {e}")
        return error_response(str(e))


@router.get("/{meeting_id}/action-items")
async def get_meeting_action_items(
        meeting_id: int,
        limit: int = Query(50, description="Number of action items to return")
):
    """Get action items for a specific meeting"""
    try:
        logger.info(f"Getting action items for meeting ID: {meeting_id}")
        
        # First check if meeting exists
        meeting = MeetingService.get_meeting_by_id(meeting_id)
        if not meeting:
            return not_found_response("Meeting")
            
        # Get action items for this meeting
        action_items = ActionItemsService.get_action_items_for_meeting(meeting_id, limit)
        
        logger.info(f"Found {len(action_items)} action items for meeting {meeting_id}")
        return success_response({"action_items": action_items})
    except Exception as e:
        logger.error(f"Error in get_meeting_action_items: {e}")
        return error_response(str(e))


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: int):
    """Get a specific meeting by ID"""
    try:
        meeting = MeetingService.get_meeting_by_id(meeting_id)
        if not meeting:
            return not_found_response("Meeting")
        return success_response(meeting)
    except Exception as e:
        logger.error(f"Error in get_meeting: {e}")
        return error_response(str(e))


@router.get("/action-items/all")
async def get_all_action_items(
        limit: int = Query(10, description="Number of action items to return")
):
    """Get all action items"""
    try:
        logger.info(f"Getting all action items with limit: {limit}")

        # Use ActionItemsService instead of MeetingService to get consistent formatting
        action_items = ActionItemsService.get_all_action_items(user_id=None, limit=limit)
        logger.info(f"Found {len(action_items)} action items in database")
        
        return success_response({"action_items": action_items})
    except Exception as e:
        logger.error(f"Error in get_all_action_items: {e}")
        return error_response(str(e))


@router.get("/action-items/meeting/{meeting_id}")
async def get_action_items_for_meeting_alt(
        meeting_id: int,
        limit: int = Query(50, description="Number of action items to return")
):
    """Get action items for a specific meeting (alternative endpoint)"""
    try:
        logger.info(f"Getting action items for meeting ID: {meeting_id} (alt endpoint)")
        
        # First check if meeting exists
        meeting = MeetingService.get_meeting_by_id(meeting_id)
        if not meeting:
            return not_found_response("Meeting")
            
        # Get action items for this meeting
        action_items = ActionItemsService.get_action_items_for_meeting(meeting_id, limit)
        
        logger.info(f"Found {len(action_items)} action items for meeting {meeting_id}")
        return success_response({"action_items": action_items})
    except Exception as e:
        logger.error(f"Error in get_action_items_for_meeting_alt: {e}")
        return error_response(str(e))


@router.post("/{meeting_id}/upload-audio")
async def upload_audio_for_meeting(
    meeting_id: int,
    audio_file: UploadFile = File(...),
    meeting_type: str = Form("general"),
    focus_question: Optional[str] = Form(None)
):
    """
    Upload an audio file for a meeting to generate transcription and summary
    """
    try:
        # Validate input parameters
        if not audio_file or not audio_file.filename:
            return error_response(
                message="No audio file provided",
                status_code=status.HTTP_400_BAD_REQUEST
            )
            
        # Validate file type
        file_extension = os.path.splitext(audio_file.filename)[1].lower()
        valid_extensions = ['.mp3', '.wav', '.mp4', '.m4a', '.aac', '.ogg', '.flac', '.mov', '.avi', '.mkv']
        if file_extension not in valid_extensions:
            return error_response(
                message=f"Invalid file format. Supported formats: {', '.join(valid_extensions)}",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # First check if meeting exists
        meeting = MeetingService.get_meeting_by_id(meeting_id)
        if not meeting:
            return not_found_response("Meeting")
        
        # Create uploads directory if it doesn't exist
        uploads_dir = Path(settings.UPLOAD_DIR)
        try:
            uploads_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Uploads directory ensured: {uploads_dir}")
        except Exception as e:
            logger.error(f"Failed to create uploads directory: {str(e)}")
            return error_response(
                message=f"Failed to create uploads directory: {str(e)}",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Create a unique filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        audio_filename = f"meeting_{meeting_id}_{timestamp}{file_extension}"
        file_path = uploads_dir / audio_filename
        
        # Save the uploaded file
        try:
            content = await audio_file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            logger.info(f"Audio file saved to {file_path}")
            
            # Check if the file was saved correctly
            if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
                return error_response(
                    message="Failed to save audio file properly",
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            logger.error(f"Error saving audio file: {str(e)}")
            return error_response(
                message=f"Error saving audio file: {str(e)}",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Process the audio file
        try:
            logger.info(f"Starting audio processing for meeting {meeting_id} with type {meeting_type}")
            result = SummarizationService.process_audio_file(
                str(file_path),
                meeting_id,
                meeting_type,
                focus_question
            )
        except Exception as e:
            logger.error(f"Unexpected error during audio processing: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return error_response(
                message=f"Unexpected error during audio processing: {str(e)}",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        if not result["success"]:
            logger.error(f"Audio processing failed: {result.get('error', 'Unknown error')}")
            return error_response(
                message=f"Failed to process audio file: {result.get('error', 'Unknown error')}",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Update the meeting with the audio path
        try:
            MeetingService.update_meeting(meeting_id, {
                "audio_path": str(file_path)
            })
            logger.info(f"Meeting {meeting_id} updated with audio path: {file_path}")
        except Exception as e:
            logger.error(f"Failed to update meeting with audio path: {str(e)}")
            # Don't return error here - processing was successful, so continue
        
        # Return success response with detailed information
        return success_response({
            "message": "Audio file processed successfully",
            "session_id": result.get("session_id"),
            "meeting_id": meeting_id,
            "file_name": audio_filename
        })
        
    except Exception as e:
        logger.error(f"Error uploading audio file: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return error_response(
            message=f"Error uploading audio file: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.get("/{meeting_id}/summary")
async def get_meeting_summary(meeting_id: int):
    """
    Get the summary for a meeting
    """
    try:
        # First check if meeting exists
        meeting = MeetingService.get_meeting_by_id(meeting_id)
        if not meeting:
            return not_found_response("Meeting")
        
        # Get the summary
        summary = SummarizationService.get_meeting_summary(meeting_id)
        
        if not summary:
            return success_response({
                "has_summary": False,
                "message": "No summary available for this meeting"
            })
        
        return success_response({
            "has_summary": True,
            "summary": summary
        })
        
    except Exception as e:
        logger.error(f"Error getting meeting summary: {str(e)}")
        return error_response(str(e))


@router.post("")
async def create_meeting(
    meeting: MeetingCreate, 
    request: Request,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """Create a new meeting"""
    try:
        # Log all headers for debugging
        logger.info("Headers received:")
        for header_name, header_value in request.headers.items():
            # Don't log the full token for security
            if header_name.lower() == 'authorization' and header_value:
                logger.info(f"  {header_name}: Bearer [token present]")
            else:
                logger.info(f"  {header_name}: {header_value}")
                
        # Check for authentication
        user_id = None
        if current_user:
            user_id = current_user.get("uid")
            logger.info(f"Authenticated user ID: {user_id}")
        else:
            logger.warning("No authenticated user found")
        
        # Check if we're in development mode
        dev_mode = settings.DEBUG or os.environ.get("FIREBASE_DEVELOPMENT_MODE", "").lower() in ("true", "1", "yes")
        logger.info(f"Development mode: {dev_mode}")
        
        # If not authenticated and not in dev mode, return 401
        if not user_id and not dev_mode:
            logger.warning("Unauthorized attempt to create meeting without authentication")
            return error_response("User authentication required", status_code=status.HTTP_401_UNAUTHORIZED)
            
        # For development, try to extract token from header manually if current_user is None
        if not user_id and dev_mode:
            try:
                # Try to get auth header
                auth_header = request.headers.get('Authorization')
                logger.debug(f"Auth header: {auth_header}")
                
                if auth_header and auth_header.startswith('Bearer '):
                    # Process the token
                    from services.auth_service import verify_token
                    token = auth_header.replace('Bearer ', '')
                    user_data = await verify_token(token)
                    if user_data:
                        user_id = user_data.get("uid")
                        logger.info(f"Extracted user ID from token: {user_id}")
            except Exception as auth_err:
                logger.warning(f"Failed to process authentication token: {auth_err}")
                # Continue without authentication in dev mode
                
        # Log the action
        logger.info(f"Creating new meeting with user_id={user_id}: {meeting.title}")
            
        # Create the meeting
        meeting_id = MeetingService.create_meeting(
            title=meeting.title,
            description=meeting.description,
            meeting_type=meeting.meeting_type,
            meeting_date=meeting.meeting_date,
            duration_seconds=meeting.duration_seconds,
            firebase_uid=user_id
        )
        
        if not meeting_id:
            return error_response("Failed to create meeting", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        logger.info(f"Successfully created meeting with ID: {meeting_id}")
        return success_response({"meeting_id": meeting_id})
    except Exception as e:
        logger.error(f"Error in create_meeting: {e}")
        return error_response(str(e))


# Additional handlers for action items under the meetings namespace to match frontend calls
@router.post("/action-items")
async def create_meeting_action_item(item: ActionItemCreate, current_user: dict = Depends(get_current_user)):
    """Forward action item creation to the action items service"""
    from routes.actionItem import create_action_item
    return await create_action_item(item, current_user)
    
@router.put("/action-items/{item_id}")
async def update_meeting_action_item(item_id: int, item: ActionItemUpdate, current_user: dict = Depends(get_current_user)):
    """Forward action item update to the action items service"""
    from routes.actionItem import update_action_item
    return await update_action_item(item_id, item, current_user)
    
@router.delete("/action-items/{item_id}")
async def delete_meeting_action_item(item_id: int, current_user: dict = Depends(get_current_user)):
    """Forward action item deletion to the action items service"""
    from routes.actionItem import delete_action_item
    return await delete_action_item(item_id, current_user)

# Utility endpoint for testing - not for production use
@router.post("/create-test-user")
async def create_test_user():
    """
    Create a test user for development and testing.
    This endpoint should NOT be exposed in production.
    """
    try:
        # Only allow in development mode
        dev_mode = settings.DEBUG or os.environ.get("FIREBASE_DEVELOPMENT_MODE", "").lower() in ("true", "1", "yes")
        if not dev_mode:
            return error_response("This endpoint is only available in development mode", status_code=status.HTTP_403_FORBIDDEN)
        
        dev_user_id = "dev-admin-at-example.com"
        
        # Create dev user if it doesn't exist
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if user exists
                cur.execute("SELECT firebase_uid FROM users WHERE firebase_uid = %s", (dev_user_id,))
                user_exists = cur.fetchone() is not None
                
                if not user_exists:
                    # Create user
                    cur.execute("""
                        INSERT INTO users (firebase_uid, email, first_name, last_name)
                        VALUES (%s, %s, %s, %s)
                    """, (dev_user_id, "admin@example.com", "Dev", "Admin"))
                    conn.commit()
                    logger.info(f"Created development user: {dev_user_id}")
                else:
                    logger.info(f"Development user already exists: {dev_user_id}")
        
        return success_response({
            "message": f"Development user created or verified: {dev_user_id}",
            "user_id": dev_user_id
        })
        
    except Exception as e:
        logger.error(f"Error creating test user: {str(e)}")
        return error_response(str(e))