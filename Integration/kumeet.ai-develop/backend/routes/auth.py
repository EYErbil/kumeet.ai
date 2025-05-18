from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from services.auth_service import create_user, verify_token, get_user_by_id
from utils.logger import setup_logger

# Set up logger
logger = setup_logger(__name__)

# Initialize OAuth2 password bearer for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

router = APIRouter(tags=["auth"])


# Request Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str


class GoogleSignInData(BaseModel):
    email: EmailStr
    firstName: str
    lastName: str
    idToken: str


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


# This is the function that was missing
async def get_current_user(authorization: str = Header(None)):
    """
    Dependency to get the current authenticated user

    Args:
        authorization (str): Authorization header with Bearer token

    Returns:
        dict: User information

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        if not authorization:
            raise HTTPException(
                status_code=401,
                detail="Authorization header is missing",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not authorization.startswith('Bearer '):
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization format. Use Bearer token",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Extract token from header
        token = authorization.replace('Bearer ', '')
        
        # Verify the token and get user info
        user = await verify_token(token)
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_current_user(authorization: str = Header(None)):
    """
    Get the current user from the token, but don't raise an exception if authentication fails.
    This allows endpoints to handle both authenticated and unauthenticated requests.
    """
    if not authorization or not authorization.startswith('Bearer '):
        logger.debug("No valid Authorization header found")
        return None
        
    try:
        # Extract the token from the Authorization header
        token = authorization.replace('Bearer ', '')
        # Use the existing verify_token function
        user = await verify_token(token)
        logger.debug(f"Successfully authenticated user: {user.get('uid')}")
        return user
    except Exception as e:
        logger.warning(f"Authentication failed: {str(e)}")
        return None


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


@router.post("/google-signin", response_model=AuthResponse)
async def google_signin(user_data: GoogleSignInData):
    try:
        logger.info(f"Received Google sign-in request for email: {user_data.email}")
        logger.debug(f"Google sign-in data: {user_data.dict(exclude={'idToken'})}")

        # First verify the token
        decoded_token = await verify_token(user_data.idToken)

        # If token is valid, create/update user in database
        user = await create_user(user_data)
        logger.info(f"Successfully processed Google sign-in for email: {user_data.email}")

        return {
            "success": True,
            "user": user
        }
    except HTTPException as e:
        logger.error(f"HTTP error during Google sign-in: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during Google sign-in: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred during Google sign-in: {str(e)}"
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