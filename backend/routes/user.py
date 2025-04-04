from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from services.user_service import UserService
from utils.logger import setup_logger
from firebase_admin import auth
from services.auth_service import verify_token

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
async def get_user(uid: str, authorization: str = Header(None)):
    try:
        logger.info(f"Fetching user with UID: {uid}")
        user = UserService.get_user_by_firebase_uid(uid)
        
        if not user:
            logger.warning(f"User not found in database with UID: {uid}. Checking Firebase...")
            
            # Check if user exists in Firebase
            try:
                # Verify auth token if provided to ensure the request is authorized
                if authorization and authorization.startswith("Bearer "):
                    token = authorization.split(" ")[1]
                    await verify_token(token)
                
                # Get user from Firebase
                firebase_user = auth.get_user(uid)
                logger.info(f"User found in Firebase with UID: {uid}. Creating DB entry.")
                
                # Extract name components from display_name
                first_name = ""
                last_name = ""
                if firebase_user.display_name:
                    name_parts = firebase_user.display_name.split(' ', 1)
                    first_name = name_parts[0]
                    last_name = name_parts[1] if len(name_parts) > 1 else ""
                
                # Create user in database
                UserService.create_user(
                    firebase_uid=uid,
                    email=firebase_user.email or "",
                    first_name=first_name,
                    last_name=last_name
                )
                
                # Fetch the newly created user
                user = UserService.get_user_by_firebase_uid(uid)
                if not user:
                    raise Exception("User created but could not be retrieved")
                    
            except Exception as e:
                logger.error(f"Failed to create user from Firebase: {str(e)}")
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
        
        # Transform the data to match the response model
        response_data = {
            "uid": updated_user["firebase_uid"],
            "email": updated_user["email"],
            "firstName": updated_user["first_name"],
            "lastName": updated_user["last_name"]
        }
        logger.info(f"Successfully updated user profile: {response_data}")
        return response_data
    except HTTPException as e:
        logger.error(f"HTTP error while updating user: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error while updating user: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while updating user")
