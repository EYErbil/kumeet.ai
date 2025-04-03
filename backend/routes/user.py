from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from services.user_service import UserService
from utils.logger import setup_logger

# Set up logger
logger = setup_logger(__name__)

router = APIRouter(tags=["user"])

# Request Models
class UserUpdate(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    email: EmailStr | None = None

# Response Models
class UserResponse(BaseModel):
    uid: str
    email: str
    firstName: str | None = None
    lastName: str | None = None

@router.get("/user/{uid}", response_model=UserResponse)
async def get_user(uid: str):
    try:
        logger.info(f"Fetching user with UID: {uid}")
        user = UserService.get_user_by_firebase_uid(uid)
        if not user:
            logger.warning(f"User not found with UID: {uid}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Transform the data to match the response model
        response_data = {
            "uid": user["firebase_uid"],
            "email": user["email"],
            "firstName": user["first_name"],
            "lastName": user["last_name"]
        }
        logger.info(f"Successfully transformed user data: {response_data}")
        return response_data
    except HTTPException as e:
        logger.error(f"HTTP error while fetching user: {str(e)}", exc_info=True)
        raise e
    except Exception as e:
        logger.error(f"Unexpected error while fetching user: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected error occurred while retrieving user: {str(e)}"
        )

@router.put("/user/{uid}", response_model=UserResponse)
async def update_user_profile(uid: str, user_data: UserUpdate):
    try:
        logger.info(f"Updating user profile for UID: {uid}")
        updated_user = UserService.update_user_profile(uid, user_data.firstName, user_data.lastName)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found or update failed")
        return updated_user
    except HTTPException as e:
        logger.error(f"HTTP error while updating user: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error while updating user: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while updating user")
