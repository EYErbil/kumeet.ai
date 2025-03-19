from firebase_admin import auth
from firebase_admin.auth import UserNotFoundError, EmailAlreadyExistsError
from fastapi import HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel, EmailStr
from utils.logger import setup_logger
from services.user_service import UserService

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
    firstName: str
    lastName: str
    created_at: Optional[str] = None

async def create_user(user_data: UserData) -> Dict[str, Any]:
    """
    Create a new user in both Firebase Authentication and local database.
    
    Args:
        user_data: UserData object containing user information
        
    Returns:
        Dict containing user information
        
    Raises:
        HTTPException: If user creation fails
    """
    try:
        logger.info(f"Creating new user with email: {user_data.email}")
        user_service = UserService()
        
        # First check if user exists in Firebase
        try:
            existing_user = auth.get_user_by_email(user_data.email)
            logger.warning(f"User already exists in Firebase with email: {user_data.email}")
            
            # Check if user exists in our database
            if not user_service.user_exists(existing_user.uid):
                # User exists in Firebase but not in our database, create in database
                logger.info(f"Creating user in database for existing Firebase user: {existing_user.uid}")
                user_service.create_user(
                    firebase_uid=existing_user.uid,
                    email=existing_user.email,
                    first_name=user_data.firstName,
                    last_name=user_data.lastName
                )
            
            # Get user from our database to return consistent response
            db_user = user_service.get_user_by_firebase_uid(existing_user.uid)
            if not db_user:
                raise HTTPException(
                    status_code=500,
                    detail="User exists in Firebase but not in database"
                )
            
            return {
                "uid": db_user['firebase_uid'],
                "email": db_user['email'],
                "firstName": db_user['first_name'],
                "lastName": db_user['last_name'],
                "created_at": db_user['created_at'].isoformat() if db_user['created_at'] else None
            }
            
        except auth.UserNotFoundError:
            # User doesn't exist in Firebase, proceed with creation
            logger.info(f"User not found in Firebase, creating new user: {user_data.email}")
            
            # Create user in Firebase
            firebase_user = auth.create_user(
                email=user_data.email,
                password=user_data.password,
                display_name=f"{user_data.firstName} {user_data.lastName}",  # Keep display_name in Firebase for UI
                email_verified=False
            )
            
            logger.info(f"Successfully created user in Firebase with uid: {firebase_user.uid}")
            
            # Create user in our database
            try:
                logger.info(f"Creating user in database with uid: {firebase_user.uid}")
                user_service.create_user(
                    firebase_uid=firebase_user.uid,
                    email=user_data.email,
                    first_name=user_data.firstName,
                    last_name=user_data.lastName
                )
                logger.info(f"Successfully created user in database with uid: {firebase_user.uid}")
                
                # Get the created user from database to return consistent response
                db_user = user_service.get_user_by_firebase_uid(firebase_user.uid)
                if not db_user:
                    raise Exception("User was created but could not be retrieved")
                
                return {
                    "uid": db_user['firebase_uid'],
                    "email": db_user['email'],
                    "firstName": db_user['first_name'],
                    "lastName": db_user['last_name'],
                    "created_at": db_user['created_at'].isoformat() if db_user['created_at'] else None
                }
                
            except Exception as db_error:
                # If database creation fails, delete the user from Firebase
                logger.error(f"Failed to create user in database: {str(db_error)}")
                try:
                    auth.delete_user(firebase_user.uid)
                    logger.info(f"Rolled back Firebase user creation for uid: {firebase_user.uid}")
                except:
                    logger.error(f"Failed to rollback Firebase user creation for uid: {firebase_user.uid}")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create user in database"
                )
            
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
    Verify Firebase ID token and ensure user exists in our database.
    
    Args:
        id_token: Firebase ID token to verify
        
    Returns:
        Dict containing user information from our database
        
    Raises:
        HTTPException: If token verification fails or user not found in database
    """
    try:
        logger.info("Verifying Firebase ID token")
        decoded_token = auth.verify_id_token(id_token)
        firebase_uid = decoded_token.get('uid')
        
        # Get user from Firebase
        firebase_user = auth.get_user(firebase_uid)
        
        # Check if user exists in our database
        user_service = UserService()
        db_user = user_service.get_user_by_firebase_uid(firebase_uid)
        
        if not db_user:
            # If user doesn't exist in our database, create them
            # This handles Google Sign-in users
            logger.info(f"Creating database entry for Firebase user: {firebase_uid}")
            
            # Split display name into first and last name
            names = firebase_user.display_name.split(' ') if firebase_user.display_name else ['', '']
            first_name = names[0]
            last_name = ' '.join(names[1:]) if len(names) > 1 else ''
            
            user_service.create_user(
                firebase_uid=firebase_uid,
                email=firebase_user.email,
                first_name=first_name,
                last_name=last_name
            )
            
            db_user = user_service.get_user_by_firebase_uid(firebase_uid)
        
        logger.info(f"Successfully verified token for uid: {firebase_uid}")
        
        return {
            "uid": db_user['firebase_uid'],
            "email": db_user['email'],
            "firstName": db_user['first_name'],
            "lastName": db_user['last_name'],
            "created_at": db_user['created_at'].isoformat() if db_user['created_at'] else None
        }
        
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