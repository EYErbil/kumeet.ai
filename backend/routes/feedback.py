from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from services.feedback_service import FeedbackService
from utils.logger import setup_logger
from services.auth_service import verify_token

# Set up logger
logger = setup_logger(__name__)

router = APIRouter(tags=["feedback"])

# Request Models
class FeedbackRequest(BaseModel):
    feedback_text: str
    feedback_type: str

# Endpoint will be at /api/feedback when included with prefix="/api"
@router.post("/feedback", status_code=201)
async def create_feedback(
    feedback_data: FeedbackRequest,
    authorization: str = Header(None)
):
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        # Get the token and verify it
        token = authorization.split(" ")[1]
        decoded_token = await verify_token(token)
        firebase_uid = decoded_token["uid"]
        
        logger.info(f"Received feedback request from user {firebase_uid}")
        
        # Validate feedback type
        valid_types = ['general feedback', 'bug report', 'feature request', 'question']
        if feedback_data.feedback_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid feedback type. Must be one of: {', '.join(valid_types)}"
            )
        
        # Create feedback
        feedback_id = FeedbackService.create_feedback(
            firebase_uid=firebase_uid,
            feedback_text=feedback_data.feedback_text,
            feedback_type=feedback_data.feedback_type
        )
        
        logger.info(f"Successfully created feedback with ID: {feedback_id}")
        return {"message": "Feedback submitted successfully", "feedback_id": feedback_id}
        
    except HTTPException as e:
        logger.error(f"HTTP error while creating feedback: {str(e)}", exc_info=True)
        raise e
    except Exception as e:
        logger.error(f"Unexpected error while creating feedback: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred while submitting feedback: {str(e)}"
        ) 