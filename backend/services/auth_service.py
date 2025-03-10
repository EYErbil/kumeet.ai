from firebase_admin import auth
from firebase_admin.auth import UserNotFoundError, EmailAlreadyExistsError
from fastapi import HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel, EmailStr
from utils.logger import setup_logger

# Set up logger for this module
logger = setup_logger(__name__)

class UserData(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str

class UserResponse(BaseModel):
    uid: str
    email: str
    displayName: str
    emailVerified: bool = False

async def create_user(user_data: UserData) -> Dict[str, Any]:
    """
    Create a new user in Firebase Authentication.
    
    Args:
        user_data: UserData object containing user information
        
    Returns:
        Dict containing user information
        
    Raises:
        HTTPException: If user creation fails
    """
    try:
        logger.info(f"Creating new user with email: {user_data.email}")
        
        # First check if user exists in Firebase
        try:
            existing_user = auth.get_user_by_email(user_data.email)
            logger.warning(f"User already exists in Firebase with email: {user_data.email}")
            
            # If we get here, user exists in Firebase
            return {
                "uid": existing_user.uid,
                "email": existing_user.email,
                "displayName": existing_user.display_name,
                "emailVerified": existing_user.email_verified
            }
            
        except auth.UserNotFoundError:
            # User doesn't exist in Firebase, proceed with creation
            logger.info(f"User not found in Firebase, creating new user: {user_data.email}")
            
            # Create user in Firebase
            user = auth.create_user(
                email=user_data.email,
                password=user_data.password,
                display_name=f"{user_data.firstName} {user_data.lastName}",
                email_verified=False
            )
            
            logger.info(f"Successfully created user with uid: {user.uid}")
            
            return {
                "uid": user.uid,
                "email": user.email,
                "displayName": user.display_name,
                "emailVerified": user.email_verified
            }
            
    except auth.EmailAlreadyExistsError as e:
        error_msg = f"Email already exists: {user_data.email}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )
    except ValueError as e:
        error_msg = f"Invalid input data: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )
    except Exception as e:
        error_msg = f"Failed to create user account: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )

async def verify_token(id_token: str) -> Dict[str, Any]:
    """
    Verify Firebase ID token.
    
    Args:
        id_token: Firebase ID token to verify
        
    Returns:
        Dict containing decoded token information
        
    Raises:
        HTTPException: If token verification fails
    """
    try:
        logger.info("Verifying Firebase ID token")
        decoded_token = auth.verify_id_token(id_token)
        logger.info(f"Successfully verified token for uid: {decoded_token.get('uid')}")
        return decoded_token
        
    except auth.InvalidIdTokenError as e:
        error_msg = "Invalid or expired authentication token"
        logger.error(f"{error_msg}: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail=error_msg
        )
    except Exception as e:
        error_msg = f"Failed to verify authentication token: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )

async def get_user_by_id(uid: str) -> Dict[str, Any]:
    """
    Get user information by UID.
    
    Args:
        uid: Firebase user ID
        
    Returns:
        Dict containing user information
        
    Raises:
        HTTPException: If user is not found or other errors occur
    """
    try:
        logger.info(f"Fetching user data for uid: {uid}")
        user = auth.get_user(uid)
        logger.info(f"Successfully retrieved user data for uid: {uid}")
        
        return {
            "uid": user.uid,
            "email": user.email,
            "displayName": user.display_name,
            "emailVerified": user.email_verified
        }
        
    except UserNotFoundError as e:
        error_msg = f"User not found with uid: {uid}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=404,
            detail=error_msg
        )
    except Exception as e:
        error_msg = f"Failed to retrieve user information: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )

async def update_user(uid: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update user information.
    
    Args:
        uid: Firebase user ID
        user_data: Dict containing fields to update
        
    Returns:
        Dict containing updated user information
        
    Raises:
        HTTPException: If update fails
    """
    try:
        logger.info(f"Updating user data for uid: {uid}")
        
        # Prepare update data
        update_kwargs = {}
        if user_data.get('firstName') and user_data.get('lastName'):
            update_kwargs['display_name'] = f"{user_data['firstName']} {user_data['lastName']}"
        if user_data.get('email'):
            update_kwargs['email'] = user_data['email']
        if user_data.get('password'):
            update_kwargs['password'] = user_data['password']
            
        # Update user in Firebase
        user = auth.update_user(uid, **update_kwargs)
        logger.info(f"Successfully updated user: {uid}")
        
        return {
            "uid": user.uid,
            "email": user.email,
            "displayName": user.display_name,
            "emailVerified": user.email_verified
        }
        
    except UserNotFoundError as e:
        error_msg = f"User not found with uid: {uid}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=404,
            detail=error_msg
        )
    except EmailAlreadyExistsError as e:
        error_msg = "Email address is already in use"
        logger.error(error_msg)
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )
    except ValueError as e:
        error_msg = f"Invalid input data: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )
    except Exception as e:
        error_msg = f"Failed to update user information: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=500,
            detail=error_msg
        ) 