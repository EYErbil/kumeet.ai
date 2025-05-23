import os
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from typing import List, Optional, Dict
from datetime import datetime, timedelta

# Add a simple in-memory cache to prevent duplicate token exchanges
# This will store recently processed codes to avoid reusing them
processed_auth_codes: Dict[str, datetime] = {}

from models.calendar_event import CalendarEvent, CalendarEventCreate, ActionItemCalendarEvent, Attendee
from models.calendar_credentials import CalendarCredentials, GoogleCredentials
from services.calendar_service import CalendarService
from services.calendar_repository import CalendarRepository
from routes.auth import get_current_user
from utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter()
calendar_service = CalendarService()
calendar_repository = CalendarRepository()

# Remove this endpoint that we added earlier to create a test user
@router.get("/create-test-user")
async def create_calendar_test_user():
    """This endpoint is deprecated. Users should be properly authenticated."""
    # Return an error since we don't want to support test users anymore
    return {
        "message": "This endpoint is deprecated. Please use proper authentication.",
        "status": "error"
    }

# Update the status endpoint to require authentication
@router.get("/status")
async def get_calendar_status(user_id: str = Depends(get_current_user)):
    """Get the connection status for all calendar types."""
    try:
        # Try to get credentials, but handle errors gracefully
        google_connected = False
        outlook_connected = False
        google_email = ""
        outlook_email = ""
        google_last_sync = ""
        outlook_last_sync = ""
        
        try:
            google_credentials = calendar_repository.get_credentials(user_id, "google")
            google_connected = google_credentials is not None
            if google_connected and hasattr(google_credentials, "email"):
                google_email = google_credentials.email
            if google_connected and hasattr(google_credentials, "updated_at"):
                google_last_sync = google_credentials.updated_at.isoformat() if google_credentials.updated_at else ""
            
            # Log the connection status
            logger.info(f"Google Calendar connected: {google_connected}")
            if google_connected:
                logger.info(f"Google credentials: {google_credentials.dict(exclude={'access_token', 'refresh_token', 'client_secret'})}")
        except Exception as e:
            logger.warning(f"Error getting Google calendar credentials: {str(e)}")
        
        try:
            outlook_credentials = calendar_repository.get_credentials(user_id, "outlook")
            outlook_connected = outlook_credentials is not None
            if outlook_connected and hasattr(outlook_credentials, "email"):
                outlook_email = outlook_credentials.email
            if outlook_connected and hasattr(outlook_credentials, "updated_at"):
                outlook_last_sync = outlook_credentials.updated_at.isoformat() if outlook_credentials.updated_at else ""
            
            # Log the connection status
            logger.info(f"Outlook Calendar connected: {outlook_connected}")
            if outlook_connected:
                logger.info(f"Outlook credentials: {outlook_credentials.dict(exclude={'access_token', 'refresh_token', 'client_secret'})}")
        except Exception as e:
            logger.warning(f"Error getting Outlook calendar credentials: {str(e)}")
        
        return {
            "google": google_connected,
            "outlook": outlook_connected,
            "google_email": google_email,
            "outlook_email": outlook_email,
            "google_last_sync": google_last_sync,
            "outlook_last_sync": outlook_last_sync
        }
    except Exception as e:
        logger.error(f"Error getting calendar status: {str(e)}")
        # Return a default response instead of raising an exception
        return {
            "google": False,
            "outlook": False,
            "google_email": "",
            "outlook_email": "",
            "google_last_sync": "",
            "outlook_last_sync": ""
        }

# Update Google status endpoint to require authentication
@router.get("/google-status")
async def check_google_calendar_status(user_id: str = Depends(get_current_user)):
    """Check the connection status for Google Calendar."""
    try:
        # Try to get credentials, but handle errors gracefully
        google_connected = False
        google_email = ""
        
        try:
            google_credentials = calendar_repository.get_credentials(user_id, "google")
            google_connected = google_credentials is not None
            
            if google_connected:
                logger.info(f"Found Google Calendar credentials for user {user_id}")
                
                # Try to get user email from credentials
                if hasattr(google_credentials, "email") and google_credentials.email:
                    google_email = google_credentials.email
                    logger.info(f"Found email in credentials: {google_email}")
                else:
                    # Try to refresh token and get email from API
                    try:
                        refreshed_credentials = calendar_service.refresh_token_if_needed(google_credentials)
                        
                        if refreshed_credentials:
                            # Create a test service
                            from google.oauth2.credentials import Credentials
                            from googleapiclient.discovery import build
                            
                            google_creds = Credentials(
                                token=refreshed_credentials.access_token,
                                refresh_token=refreshed_credentials.refresh_token,
                                token_uri=refreshed_credentials.token_uri or "https://oauth2.googleapis.com/token",
                                client_id=refreshed_credentials.client_id,
                                client_secret=refreshed_credentials.client_secret,
                                scopes=refreshed_credentials.scopes
                            )
                            
                            service = build('calendar', 'v3', credentials=google_creds)
                            profile = service.calendarList().get(calendarId='primary').execute()
                            
                            if 'id' in profile:
                                google_email = profile['id']  # This is the user's email
                                logger.info(f"Retrieved user email from API: {google_email}")
                                
                                # Update the credentials with the email
                                refreshed_credentials.email = google_email
                                calendar_repository.update_credentials(refreshed_credentials)
                    except Exception as e:
                        logger.warning(f"Error getting Google user email: {str(e)}")
            
            # Log the connection status
            logger.info(f"Google Calendar connected: {google_connected}")
            if google_connected:
                logger.info(f"Google credentials: {google_credentials.dict(exclude={'access_token', 'refresh_token', 'client_secret'})}")
        except Exception as e:
            logger.warning(f"Error getting Google calendar credentials: {str(e)}")
        
        return {
            "connected": google_connected,
            "email": google_email,
            "message": "Google Calendar is connected" if google_connected else "Google Calendar is not connected"
        }
    except Exception as e:
        logger.error(f"Error getting Google calendar status: {str(e)}")
        # Return a default response instead of raising an exception
        return {
            "connected": False,
            "email": "",
            "message": f"Error checking Google Calendar connection: {str(e)}"
        }

@router.get("/public-save-google-credentials")
async def public_save_google_credentials(code: str, user_id: str, state: str = None):
    """Public endpoint to directly save Google Calendar credentials to the database without requiring authentication."""
    try:
        from config.calendar import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
        from services.google_calendar_service import SCOPES
        from services.user_service import UserService
        
        if state:
            try:
                import json
                state_obj = json.loads(state)
                logger.info(f"Decoded state object: {state_obj}")
                if 'userId' in state_obj:
                    logger.info(f"User ID from state: {state_obj['userId']}")
            except:
                logger.warning(f"Could not decode state parameter: {state}")
        
        # Validate user_id parameter
        if not user_id or user_id.strip() == "":
            logger.error("Empty user_id provided to public_save_google_credentials")
            return {
                "status": "error",
                "error": "User ID is required"
            }
        
        # Check if the user exists in the database
        user_exists = False
        try:
            user_service = UserService()
            user_details = await user_service.get_user_by_id(user_id)
            if user_details:
                user_exists = True
        except Exception as user_details_error:
            logger.error(f"Error getting user details: {str(user_details_error)}")
            user_exists = False
        
        # If user doesn't exist in the database, check directly
        if not user_exists:
            try:
                from database.db import get_db_connection
                with get_db_connection() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute(
                            "SELECT COUNT(*) FROM users WHERE firebase_uid = %s",
                            (user_id,)
                        )
                        result = cursor.fetchone()
                        user_exists = result[0] > 0
            except Exception as db_error:
                logger.error(f"Error checking user directly in database: {str(db_error)}")
        
        if not user_exists:
            logger.error(f"User {user_id} does not exist in the database")
            return {
                "status": "error",
                "error": f"User with ID {user_id} not found",
                "error_details": "User must exist in the database before connecting to Google Calendar"
            }
        
        # Check if we've already processed this code to prevent duplicate processing
        processed_auth_codes = {}
        
        # Track all processed auth codes in memory
        if code in processed_auth_codes:
            logger.info(f"This authorization code has already been processed at {processed_auth_codes[code]}")
            return {
                "status": "success",
                "message": "This authorization code has already been processed."
            }
        
        # Process the code
        from models.calendar import CalendarCredentials, GoogleCalendarCredentials
        from services.calendar_repository import CalendarRepository
        
        # Check if user already has Google Calendar credentials
        calendar_repo = CalendarRepository()
        existing_credentials = await calendar_repo.get_calendar_credentials(
            user_id=user_id, 
            calendar_type="google"
        )
        
        if existing_credentials:
            logger.info(f"User {user_id} already has Google Calendar credentials")
            
            # Create a service using the existing credentials
            from services.google_calendar_service import GoogleCalendarService
            google_calendar_service = GoogleCalendarService()
            
            # Try to use the existing credentials
            try:
                # Load the credentials from the database
                google_credentials = GoogleCalendarCredentials(
                    user_id=user_id,
                    calendar_type="google",
                    access_token=existing_credentials.get("access_token"),
                    refresh_token=existing_credentials.get("refresh_token"),
                    token_expiry=existing_credentials.get("token_expiry"),
                    client_id=GOOGLE_CLIENT_ID,
                    client_secret=GOOGLE_CLIENT_SECRET,
                    token_uri="https://oauth2.googleapis.com/token",
                    scopes=existing_credentials.get("scopes", SCOPES)
                )
                
                # Check if token is expired and needs refresh
                import datetime
                if google_credentials.token_expiry and google_credentials.token_expiry < datetime.datetime.now():
                    logger.info("Existing token is expired, attempting to refresh")
                    google_service = await google_calendar_service.get_service(google_credentials)
                    # If this succeeds, the credentials are refreshed
                    google_credentials = google_calendar_service.credentials
                    logger.info("Successfully refreshed existing token")
                
                # Test the credentials by fetching calendars
                google_service = await google_calendar_service.get_service(google_credentials)
                calendar_list = await google_calendar_service.list_calendars(google_service)
                logger.info(f"Existing credentials are valid, found {len(calendar_list.get('items', []))} calendars")
                
                # Store the refreshed credentials
                await calendar_repo.save_credentials(google_credentials)
                
                # Mark this code as processed
                from datetime import datetime
                processed_auth_codes[code] = datetime.now().isoformat()
                
                return {
                    "status": "success",
                    "message": "Google Calendar connection refreshed successfully",
                    "email": google_credentials.email if hasattr(google_credentials, "email") else None
                }
                
            except Exception as e:
                # If we can't use the existing credentials, we'll create new ones
                logger.warning(f"Existing credentials are invalid, will create new ones: {str(e)}")
        
        # Create new OAuth flow and exchange the authorization code for tokens
        logger.info(f"Creating OAuth flow for user {user_id}")
        
        from google_auth_oauthlib.flow import Flow
        import googleapiclient.discovery
        
        # Create a flow instance to manage the OAuth 2.0 Authorization Grant Flow steps
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GOOGLE_REDIRECT_URI]
                }
            },
            scopes=SCOPES,
            redirect_uri=GOOGLE_REDIRECT_URI
        )
        
        try:
            # Exchange authorization code for tokens
            logger.info("Attempting to exchange code for tokens...")
            
            # Use the authorization code to get tokens
            flow.fetch_token(code=code)
            credentials = flow.credentials
            logger.info("Successfully exchanged code for tokens")
            logger.info(f"Access token received: {bool(credentials.token)}")
            logger.info(f"Refresh token received: {bool(credentials.refresh_token)}")
            logger.info(f"Token expiry: {credentials.expiry}")
            
            # Mark this code as processed
            from datetime import datetime
            processed_auth_codes[code] = datetime.now().isoformat()
            
            # Create calendar credentials model
            scopes_list = credentials.scopes if hasattr(credentials, "scopes") else SCOPES
            logger.info(f"Using scopes: {scopes_list}")
                
            google_credentials = GoogleCalendarCredentials(
                user_id=user_id,
                calendar_type="google",
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
                token_expiry=credentials.expiry,
                client_id=GOOGLE_CLIENT_ID,
                client_secret=GOOGLE_CLIENT_SECRET,
                token_uri=credentials.token_uri,
                scopes=scopes_list
            )
            
            # Save credentials to database
            try:
                # Delete any existing credentials first
                logger.info(f"Deleting any existing credentials for user {user_id}")
                await calendar_repo.delete_calendar_credentials(user_id, "google")
                
                # Save the new credentials
                logger.info(f"Saving credentials to database for user {user_id}")
                credentials_id = await calendar_repo.save_credentials(google_credentials)
                logger.info(f"Saved credentials with ID: {credentials_id}")
            except Exception as db_error:
                logger.error(f"Error saving to database: {str(db_error)}")
                raise
            
            # Test the saved credentials
            logger.info(f"Testing saved credentials for user {user_id}")
            from services.google_calendar_service import GoogleCalendarService
            google_calendar_service = GoogleCalendarService()
            google_service = await google_calendar_service.get_service(google_credentials)
            
            # Test listinq calendars
            calendar_list = await google_calendar_service.list_calendars(google_service)
            logger.info(f"Successfully retrieved {len(calendar_list.get('items', []))} calendars")
            
            # Try to get user email
            try:
                # Get user profile
                user_info_service = googleapiclient.discovery.build(
                    'oauth2', 'v2',
                    credentials=credentials
                )
                user_info = user_info_service.userinfo().get().execute()
                google_credentials.email = user_info.get('email')
                logger.info(f"Retrieved user email: {google_credentials.email}")
                
                # Update credentials with email
                await calendar_repo.update_credentials_email(user_id, "google", google_credentials.email)
                logger.info(f"Updated credentials with email: {google_credentials.email}")
            except Exception as email_error:
                logger.warning(f"Could not retrieve user email: {str(email_error)}")
                try:
                    if hasattr(credentials, 'id_token') and credentials.id_token:
                        # Try to get email from ID token if available
                        import jwt
                        decoded = jwt.decode(credentials.id_token, options={"verify_signature": False})
                        google_credentials.email = decoded.get('email')
                        await calendar_repo.update_credentials_email(user_id, "google", google_credentials.email)
                        logger.info(f"Updated credentials with existing email: {google_credentials.email}")
                except Exception as update_error:
                    logger.warning(f"Could not update credentials with email: {str(update_error)}")
            
            # Success response
            logger.info(f"Successfully completed credential saving for user {user_id}")
            return {
                "status": "success",
                "message": "Google Calendar connected successfully",
                "email": google_credentials.email if hasattr(google_credentials, "email") else None
            }
            
        except Exception as token_error:
            import traceback
            logger.error(f"Error in token exchange or credential saving: {str(token_error)}")
            logger.error(traceback.format_exc())
            
            error_message = str(token_error)
            error_details = ""
            
            if "invalid_grant" in error_message.lower():
                logger.error("Invalid grant error - the authorization code may have expired or been used already")
                error_message = "Authorization code has expired or already been used"
                error_details = "Please try connecting to Google Calendar again"
            elif "redirect_uri_mismatch" in error_message.lower():
                error_message = "Redirect URI mismatch"
                error_details = f"The redirect URI in the request: {GOOGLE_REDIRECT_URI} does not match the one authorized for the OAuth client"
                logger.error(f"Redirect URI mismatch. Using: {GOOGLE_REDIRECT_URI}")
            elif "invalid_client" in error_message.lower():
                error_message = "Invalid client credentials"
                error_details = "Please check your Google API credentials configuration"
            elif "access_denied" in error_message.lower():
                error_message = "Access denied"
                error_details = "You may have declined the permission request"
            
            return {
                "status": "error",
                "error": error_message,
                "error_details": error_details
            }
    except Exception as e:
        import traceback
        logger.error(f"Unhandled exception in credential saving: {str(e)}")
        logger.error(traceback.format_exc())
        
        return {
            "status": "error",
            "error": "An unexpected error occurred",
            "error_details": str(e)
        }

@router.get("/diagnose-user/{user_id}")
async def diagnose_user(user_id: str):
    """Diagnostic endpoint to check if a user exists and has calendar credentials."""
    try:
        from services.user_service import UserService
        
        user_service = UserService()
        logger.info(f"Diagnosing user {user_id}")
        
        # Check if user exists
        user_exists = user_service.user_exists(user_id)
        logger.info(f"User exists check result: {user_exists}")
        
        # Get detailed information about the user
        user_details = None
        try:
            user_details = user_service.get_user_by_firebase_uid(user_id)
            logger.info(f"User details lookup result: {user_details}")
        except Exception as user_details_error:
            logger.error(f"Error getting user details: {str(user_details_error)}")
        
        # Check for calendar credentials
        google_credentials = None
        try:
            google_credentials = calendar_repository.get_credentials(user_id, "google")
            logger.info(f"Google credentials found: {google_credentials is not None}")
            if google_credentials:
                logger.info(f"Google credentials email: {getattr(google_credentials, 'email', 'None')}")
        except Exception as creds_error:
            logger.error(f"Error getting Google credentials: {str(creds_error)}")
        
        # Check users table directly using raw SQL
        sql_result = None
        try:
            from database.connection import get_db_connection
            from psycopg2.extras import RealDictCursor
            
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute("SELECT * FROM users WHERE firebase_uid = %s", (user_id,))
                    sql_result = cursor.fetchone()
        except Exception as db_error:
            logger.error(f"Error checking user directly in database: {str(db_error)}")
        
        # Check calendar_credentials table directly
        cal_creds_result = None
        try:
            from database.connection import get_db_connection
            from psycopg2.extras import RealDictCursor
            
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute("SELECT * FROM calendar_credentials WHERE user_id = %s", (user_id,))
                    cal_creds_result = cursor.fetchall()
        except Exception as db_error:
            logger.error(f"Error checking calendar credentials in database: {str(db_error)}")
        
        return {
            "user_id": user_id,
            "user_exists": user_exists,
            "user_details": user_details,
            "google_credentials_exist": google_credentials is not None,
            "sql_user_result": sql_result,
            "calendar_credentials": cal_creds_result,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error diagnosing user: {str(e)}")
        return {
            "message": "Error diagnosing user",
            "error": str(e),
            "status": "error"
        } 