from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import logging
import os
import shutil
from services.meeting_service import MeetingService
from services.actionItems_service import ActionItemsService
from services.summarizer_service import SummarizerService
from .auth import get_current_user
import json

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
            raise HTTPException(status_code=404, detail="Meeting not found")
            
        # Get action items for this meeting
        action_items = ActionItemsService.get_action_items_for_meeting(meeting_id, limit)
        
        logger.info(f"Found {len(action_items)} action items for meeting {meeting_id}")
        return {"action_items": action_items}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_meeting_action_items: {e}")
        # Return empty list instead of error to avoid breaking the frontend
        return {"action_items": []}


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
        logger.info(f"Getting all action items with limit: {limit}")

        # Use ActionItemsService instead of MeetingService to get consistent formatting
        action_items = ActionItemsService.get_all_action_items(user_id=None, limit=limit)
        logger.info(f"Found {len(action_items)} action items in database")
        
        return {"action_items": action_items}
    except Exception as e:
        logger.error(f"Error in get_all_action_items: {e}")
        # Return empty list instead of error to avoid breaking the frontend
        return {"action_items": []}


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
            raise HTTPException(status_code=404, detail="Meeting not found")
            
        # Get action items for this meeting
        action_items = ActionItemsService.get_action_items_for_meeting(meeting_id, limit)
        
        logger.info(f"Found {len(action_items)} action items for meeting {meeting_id}")
        return {"action_items": action_items}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in get_action_items_for_meeting_alt: {e}")
        # Return empty list instead of error to avoid breaking the frontend
        return {"action_items": []}


@router.post("/{meeting_id}/upload-video")
async def upload_meeting_video(
    meeting_id: int,
    file: UploadFile = File(...),
    meeting_type: Optional[str] = Form(None),
    quality: str = Form("normal"),
    min_importance: int = Form(6),
    focus_question: Optional[str] = Form(None)
):
    """Upload a video file for a meeting and process it through the summarization pipeline"""
    try:
        logger.info(f"Video upload started for meeting ID: {meeting_id}")
        logger.info(f"File: {file.filename}, Size: {file.size if hasattr(file, 'size') else 'unknown'}")
        logger.info(f"Meeting type: {meeting_type}, Quality: {quality}, Min importance: {min_importance}")
        
        # First check if meeting exists
        meeting = MeetingService.get_meeting_by_id(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Define upload directory (create if it doesn't exist)
        upload_dir = os.path.join(os.getcwd(), "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save the uploaded file with a timestamp to prevent overwriting
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{meeting_id}_{timestamp}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(upload_dir, safe_filename)
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"File saved successfully: {file_path}")
        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")
        
        # Start processing in a background task
        logger.info(f"Starting video processing pipeline for meeting ID: {meeting_id}, file: {file_path}")
        try:
            result = SummarizerService.process_video(
                video_path=file_path,
                meeting_id=meeting_id,
                meeting_type=meeting_type,
                quality=quality,
                min_importance=min_importance,
                focus_question=focus_question
            )
            
            if result["success"]:
                # Update meeting with session ID (for future reference)
                MeetingService.update_meeting_session_id(meeting_id, result["session_id"])
                
                # Update meeting with transcript and summary files if available
                if "transcript_file" in result and result["transcript_file"] and os.path.exists(result["transcript_file"]):
                    MeetingService.update_meeting_transcript_path(meeting_id, result["transcript_file"])
                
                if "summary_file" in result and result["summary_file"] and os.path.exists(result["summary_file"]):
                    MeetingService.update_meeting_summary_path(meeting_id, result["summary_file"])
                
                logger.info(f"Pipeline completed successfully for meeting ID: {meeting_id}")
                return {
                    "message": "Video uploaded and processing completed successfully",
                    "meeting_id": meeting_id,
                    "session_id": result["session_id"],
                    "output_directory": result["output_directory"],
                    "transcript_available": result["transcript_available"],
                    "summary_available": result["summary_available"],
                    "processing_time": result.get("processing_time", "unknown"),
                    "file_name": file.filename
                }
            elif result.get("partial_success", False):
                # Partial success - save what we have
                MeetingService.update_meeting_session_id(meeting_id, result["session_id"])
                
                # Update meeting with transcript and summary files if available
                if "transcript_file" in result and result["transcript_file"] and os.path.exists(result["transcript_file"]):
                    MeetingService.update_meeting_transcript_path(meeting_id, result["transcript_file"])
                
                if "summary_file" in result and result["summary_file"] and os.path.exists(result["summary_file"]):
                    MeetingService.update_meeting_summary_path(meeting_id, result["summary_file"])
                
                error_msg = result.get('error', 'Unknown error in summarizer pipeline')
                warning_msg = result.get('warning', None)
                
                logger.warning(f"Pipeline completed with partial success for meeting ID {meeting_id}: {error_msg}")
                return {
                    "message": f"Video processed with limited features: {error_msg}",
                    "meeting_id": meeting_id,
                    "session_id": result["session_id"],
                    "output_directory": result["output_directory"],
                    "transcript_available": result["transcript_available"],
                    "summary_available": result["summary_available"],
                    "processing_time": result.get("processing_time", "unknown"),
                    "file_name": file.filename,
                    "success": True,  # Report true to frontend to continue
                    "warning": warning_msg,
                    "has_diarization": result.get("has_diarization", False)
                }
            else:
                error_msg = result.get('error', 'Unknown error in summarizer pipeline')
                logger.error(f"Pipeline failed for meeting ID {meeting_id}: {error_msg}")
                return {
                    "message": f"Video uploaded but processing failed: {error_msg}",
                    "meeting_id": meeting_id,
                    "file_name": file.filename,
                    "success": False,
                    "error": error_msg
                }
        except Exception as e:
            logger.error(f"Error in summarizer pipeline: {str(e)}", exc_info=True)
            return {
                "message": f"Video uploaded but processing failed: {str(e)}",
                "meeting_id": meeting_id,
                "file_name": file.filename,
                "success": False,
                "error": str(e)
            }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in upload_meeting_video: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload video: {str(e)}")


@router.post("/")
async def create_meeting(
    meeting: MeetingCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new meeting"""
    try:
        # Extract user ID from the authenticated user
        firebase_uid = current_user.get("uid", "default_user")
        # If no uid, use a default user
        if not firebase_uid:
            firebase_uid = "default_user"
            
        logger.info(f"Creating new meeting: {meeting.title} for user {firebase_uid}")
        # Use MeetingService to create the meeting in the database with the user's ID
        meeting_id = MeetingService.create_meeting(meeting, firebase_uid)
        logger.info(f"Created meeting with ID: {meeting_id}")
        return {"meeting_id": meeting_id}
    except Exception as e:
        logger.error(f"Error in create_meeting: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create meeting: {str(e)}")


@router.post("/create-without-auth")
async def create_meeting_without_auth(
    meeting: MeetingCreate
):
    """Create a new meeting without authentication (temporary solution)"""
    try:
        # Use a default user ID
        firebase_uid = "default_user"
            
        logger.info(f"Creating new meeting without auth: {meeting.title}")
        # Use MeetingService to create the meeting in the database
        meeting_id = MeetingService.create_meeting(meeting, firebase_uid)
        logger.info(f"Created meeting with ID: {meeting_id}")
        return {"meeting_id": meeting_id}
    except Exception as e:
        logger.error(f"Error in create_meeting_without_auth: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create meeting: {str(e)}")


@router.post("/{meeting_id}/upload-transcript")
async def upload_meeting_transcript(
    meeting_id: int,
    file: UploadFile = File(...),
    summary_type: str = Form("overview"),
    min_importance: int = Form(6),
    update_summary: bool = Form(True)
):
    """
    Upload a JSON transcript file to update a meeting's transcript and optionally its summary
    
    The JSON should be in the format:
    [
        {
            "speaker": "Speaker Name",
            "start": 10.5,
            "end": 20.3,
            "text": "Transcript text"
        },
        ...
    ]
    """
    try:
        # First check if meeting exists
        meeting = MeetingService.get_meeting_by_id(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Parse the uploaded JSON
        try:
            contents = await file.read()
            transcript_data = json.loads(contents)
            
            if not isinstance(transcript_data, list):
                raise ValueError("Transcript data must be a list of segments")
                
            # Basic validation of format
            for segment in transcript_data:
                if not all(k in segment for k in ["speaker", "start", "end", "text"]):
                    raise ValueError("Each segment must have speaker, start, end, and text fields")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Save transcript to database
        success = MeetingService.update_meeting_transcript_segments(meeting_id, transcript_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update transcript segments")
        
        result = {
            "message": "Transcript updated successfully",
            "meeting_id": meeting_id,
            "segments_count": len(transcript_data),
            "summary_updated": False
        }
        
        # Update summary if requested
        if update_summary:
            # Save the transcript to a temporary file for processing
            temp_dir = os.path.join(os.getcwd(), "temp")
            os.makedirs(temp_dir, exist_ok=True)
            
            transcript_file = os.path.join(temp_dir, f"meeting_{meeting_id}_transcript.json")
            with open(transcript_file, "w") as f:
                json.dump(transcript_data, f)
            
            # Generate a summary
            try:
                from summarizer.summarize import summarize_transcript
                
                # Create a session ID
                session_id = f"meeting_{meeting_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                # Ensure results directory exists
                results_dir = os.path.join(os.getcwd(), "results", f"{session_id}")
                os.makedirs(results_dir, exist_ok=True)
                
                # Generate summary
                summary = summarize_transcript(
                    session_id, 
                    results_dir,
                    meeting_type=meeting.get("meeting_type", "generic"),
                    min_importance=min_importance,
                    input_transcript=transcript_data  # Pass the transcript data directly
                )
                
                if summary:
                    # Save summary to database
                    MeetingService.add_meeting_summary(
                        meeting_id, 
                        summary_type, 
                        summary
                    )
                    
                    # Save overview to DB
                    overview = extract_overview_from_summary(summary)
                    if overview:
                        MeetingService.add_meeting_summary(
                            meeting_id, 
                            "overview", 
                            overview
                        )
                    
                    # Extract key points if available
                    key_points = extract_key_points_from_summary(summary)
                    if key_points:
                        for point in key_points:
                            MeetingService.add_meeting_decision(
                                meeting_id, 
                                point
                            )
                    
                    result["summary_updated"] = True
                    result["summary_length"] = len(summary)
            except Exception as e:
                logger.error(f"Error generating summary: {str(e)}", exc_info=True)
                result["summary_error"] = str(e)
        
        return result
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in upload_meeting_transcript: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload transcript: {str(e)}")

def extract_overview_from_summary(summary: str) -> str:
    """Extract an overview from the summary text"""
    # Look for the "FINAL SUMMARY" section
    if "# FINAL SUMMARY" in summary:
        # Get the text after the header
        overview_section = summary.split("# FINAL SUMMARY")[1].strip()
        
        # Take the first paragraph as the overview
        paragraphs = overview_section.split("\n\n")
        if paragraphs:
            if "Key points" in paragraphs[0]:
                # Skip the "Key points" heading and take the next paragraph
                return paragraphs[1] if len(paragraphs) > 1 else paragraphs[0]
            return paragraphs[0]
            
    # Fallback - take the first 200 characters
    return summary[:200] + "..."

def extract_key_points_from_summary(summary: str) -> list:
    """Extract key points from the summary text"""
    key_points = []
    
    # Look for bullet points in the Key points section
    if "Key points" in summary:
        lines = summary.split("\n")
        for line in lines:
            # Look for lines that start with bullet points or numbers
            if line.strip().startswith(("-", "*", "•")) or (line.strip() and line.strip()[0].isdigit() and ". " in line):
                # Remove the bullet point or number and extract the text
                point_text = line.strip()
                for prefix in ["-", "*", "•"]:
                    if point_text.startswith(prefix):
                        point_text = point_text[len(prefix):].strip()
                        break
                
                # If it's a numbered point, remove the number
                if point_text and point_text[0].isdigit() and ". " in point_text:
                    point_text = point_text.split(". ", 1)[1].strip()
                
                # Remove timestamp if present
                if "[timestamp:" in point_text:
                    point_text = point_text.split("[timestamp:", 1)[0].strip()
                
                if point_text:
                    key_points.append(point_text)
    
    return key_points