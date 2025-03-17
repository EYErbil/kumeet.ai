from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from services.auth_service import create_user, verify_token, get_user_by_id, update_user
from utils.logger import setup_logger
from typing import Optional

# Set up logger
logger = setup_logger(__name__)

router = APIRouter(tags=["auth"])

# Request Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str

class TokenVerify(BaseModel):
    idToken: str

# Response Models
class UserResponse(BaseModel):
    uid: str
    email: str
    displayName: str | None = None

class AuthResponse(BaseModel):
    success: bool
    user: UserResponse | dict

# Dependency to get the current user from the Authorization header
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        logger.warning("Missing or invalid Authorization header")
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    
    try:
        decoded_token = await verify_token(token)
        logger.info(f"Successfully authenticated user: {decoded_token.get('uid')}")
        return decoded_token.get('uid')
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials"
        )

@router.post("/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    try:
        logger.info(f"Received registration request for email: {user_data.email}")
        logger.debug(f"Registration data: {user_data.dict(exclude={'password'})}")
        
        if len(user_data.password) < 6:
            logger.warning(f"Password too short for email: {user_data.email}")
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 6 characters long"
            )

        user = await create_user(user_data)
        logger.info(f"Successfully registered user with email: {user_data.email}")
        
        return {
            "success": True,
            "user": user
        }
    except HTTPException as e:
        logger.error(f"HTTP error during registration: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during registration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred during registration: {str(e)}"
        )

@router.post("/verify-token", response_model=AuthResponse)
async def verify_auth_token(token_data: TokenVerify):
    try:
        logger.info("Received token verification request")
        decoded_token = await verify_token(token_data.idToken)
        logger.info(f"Successfully verified token for user: {decoded_token.get('uid')}")
        
        return {
            "success": True,
            "user": decoded_token
        }
    except HTTPException as e:
        logger.error(f"HTTP error during token verification: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during token verification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred during token verification: {str(e)}"
        )

@router.get("/user/{uid}", response_model=AuthResponse)
async def get_user(uid: str):
    try:
        logger.info(f"Received request to get user with uid: {uid}")
        user = await get_user_by_id(uid)
        logger.info(f"Successfully retrieved user with uid: {uid}")
        
        return {
            "success": True,
            "user": user
        }
    except HTTPException as e:
        logger.error(f"HTTP error while getting user: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error while getting user: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while retrieving user"
        ) 