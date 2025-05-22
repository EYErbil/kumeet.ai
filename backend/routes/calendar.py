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
    """Create the test user that matches the TEST_USER_ID used in the frontend."""
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
async def public_save_google_credentials(code: str, user_id: str):
    """Public endpoint to directly save Google Calendar credentials to the database without requiring authentication."""
    try:
        from config.calendar import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
        from services.google_calendar_service import SCOPES
        from services.user_service import UserService
        
        logger.info(f"Saving Google Calendar credentials for user {user_id} without authentication")
        logger.info(f"Using redirect URI: {GOOGLE_REDIRECT_URI}")
        logger.info(f"Code length: {len(code)} characters, first 10 chars: {code[:10]}...")
        
        # First, verify that the user exists in the database
        user_service = UserService()
        if not user_service.user_exists(user_id):
            logger.error(f"User {user_id} does not exist in the database")
            return {
                "message": "Error saving Google Calendar credentials",
                "error": "User does not exist in the database. Please ensure you are logged in properly.",
                "status": "error"
            }
            
        # Check if this code has already been processed
        if code in processed_auth_codes:
            logger.info(f"This authorization code has already been processed at {processed_auth_codes[code]}")
            return {
                "message": "This authorization code has already been processed",
                "status": "success",
                "already_processed": True
            }
        
        # Create a simple OAuth flow to test the configuration
        from google_auth_oauthlib.flow import Flow
        from google.oauth2.credentials import Credentials
        
        # First, check if we already have valid credentials for this user
        existing_credentials = calendar_repository.get_credentials(user_id, "google")
        if existing_credentials and existing_credentials.access_token and existing_credentials.refresh_token:
            logger.info(f"User {user_id} already has Google Calendar credentials")
            
            try:
                # Test if the existing credentials are valid
                from google.oauth2.credentials import Credentials
                from googleapiclient.discovery import build
                
                google_creds = Credentials(
                    token=existing_credentials.access_token,
                    refresh_token=existing_credentials.refresh_token,
                    token_uri=existing_credentials.token_uri or "https://oauth2.googleapis.com/token",
                    client_id=existing_credentials.client_id,
                    client_secret=existing_credentials.client_secret,
                    scopes=existing_credentials.scopes
                )
                
                # Try to refresh the token if it's expired
                if existing_credentials.token_expiry and existing_credentials.token_expiry < datetime.now():
                    logger.info("Existing token is expired, attempting to refresh")
                    refreshed_credentials = calendar_service.refresh_token_if_needed(existing_credentials)
                    if refreshed_credentials:
                        existing_credentials = refreshed_credentials
                        logger.info("Successfully refreshed existing token")
                
                # Test the credentials with a simple API call
                service = build('calendar', 'v3', credentials=google_creds)
                calendar_list = service.calendarList().list(maxResults=1).execute()
                
                logger.info(f"Existing credentials are valid, found {len(calendar_list.get('items', []))} calendars")
                
                # Mark this code as processed
                processed_auth_codes[code] = datetime.now()
                
                # Return success with existing credentials
                return {
                    "message": "Using existing Google Calendar credentials",
                    "credentials_id": existing_credentials.id,
                    "email": getattr(existing_credentials, "email", None),
                    "token_info": {
                        "access_token_valid": True,
                        "has_refresh_token": bool(existing_credentials.refresh_token),
                        "expiry": str(existing_credentials.token_expiry) if existing_credentials.token_expiry else None
                    },
                    "status": "success"
                }
            except Exception as e:
                logger.warning(f"Existing credentials are invalid, will create new ones: {str(e)}")
                # Continue with the flow to get new credentials
        
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
            scopes=SCOPES  # Use the same scopes as GoogleCalendarService
        )
        flow.redirect_uri = GOOGLE_REDIRECT_URI
        
        try:
            # Exchange code for tokens
            logger.info("Attempting to exchange code for tokens...")
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            logger.info("Successfully exchanged code for tokens")
            logger.info(f"Access token received: {bool(credentials.token)}")
            logger.info(f"Refresh token received: {bool(credentials.refresh_token)}")
            logger.info(f"Token expiry: {credentials.expiry}")
            
            # Create a GoogleCredentials object
            # Ensure SCOPES is properly handled as a list
            scopes_list = SCOPES
            if isinstance(SCOPES, str):
                scopes_list = [SCOPES]
            elif not isinstance(SCOPES, list):
                scopes_list = list(SCOPES)  # Convert other iterables to list
            
            logger.info(f"Using scopes: {scopes_list}")
            
            google_credentials = GoogleCredentials(
                user_id=user_id,
                calendar_type="google",
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
                token_expiry=datetime.now() + timedelta(seconds=credentials.expiry.timestamp() - datetime.now().timestamp()) if credentials.expiry else None,
                client_id=GOOGLE_CLIENT_ID,
                client_secret=GOOGLE_CLIENT_SECRET,
                scopes=scopes_list,  # Now properly handled as a List[str]
                token_uri="https://oauth2.googleapis.com/token"
            )
            
            # Delete any existing credentials first to avoid conflicts
            calendar_repository.delete_credentials(user_id, "google")
            
            # Save credentials to database
            credentials_id = calendar_repository.save_credentials(google_credentials)
            logger.info(f"Saved credentials with ID: {credentials_id}")
            
            # Test the credentials by making a simple API call
            from googleapiclient.discovery import build
            service = build('calendar', 'v3', credentials=credentials)
            
            # Get the user's calendar list
            calendar_list = service.calendarList().list().execute()
            logger.info(f"Successfully retrieved {len(calendar_list.get('items', []))} calendars")
            
            # Get the user's email
            try:
                profile = service.calendarList().get(calendarId='primary').execute()
                if 'id' in profile:
                    google_credentials.email = profile['id']  # This is the user's email
                    logger.info(f"Retrieved user email: {google_credentials.email}")
                    # Update the credentials with the email
                    google_credentials.id = credentials_id
                    calendar_repository.update_credentials(google_credentials)
                    logger.info(f"Updated credentials with email: {google_credentials.email}")
            except Exception as email_error:
                logger.warning(f"Could not retrieve user email: {str(email_error)}")
                # Even if we couldn't get the email through the API, try to update with what we have
                if hasattr(google_credentials, 'email') and google_credentials.email:
                    try:
                        google_credentials.id = credentials_id
                        calendar_repository.update_credentials(google_credentials)
                        logger.info(f"Updated credentials with existing email: {google_credentials.email}")
                    except Exception as update_error:
                        logger.warning(f"Could not update credentials with email: {str(update_error)}")
            
            # Mark this code as processed
            processed_auth_codes[code] = datetime.now()
            
            return {
                "message": "Successfully saved Google Calendar credentials",
                "credentials_id": credentials_id,
                "email": getattr(google_credentials, "email", None),
                "token_info": {
                    "access_token_valid": bool(credentials.token),
                    "has_refresh_token": bool(credentials.refresh_token),
                    "expiry": str(credentials.expiry) if credentials.expiry else None
                },
                "calendar_count": len(calendar_list.get('items', [])),
                "status": "success"
            }
        except Exception as token_error:
            logger.error(f"Error exchanging code for tokens: {str(token_error)}")
            error_details = str(token_error)
            
            # Provide more detailed error information
            if "invalid_grant" in error_details:
                logger.error("Invalid grant error - the authorization code may have expired or been used already")
                return {
                    "message": "Error saving Google Calendar credentials",
                    "error": "The authorization code is invalid or has expired. Please try connecting again.",
                    "error_details": error_details,
                    "status": "error"
                }
            elif "redirect_uri_mismatch" in error_details:
                logger.error(f"Redirect URI mismatch. Using: {GOOGLE_REDIRECT_URI}")
                return {
                    "message": "Error saving Google Calendar credentials",
                    "error": "The redirect URI doesn't match what's configured in Google Cloud Console.",
                    "configured_uri": GOOGLE_REDIRECT_URI,
                    "error_details": error_details,
                    "status": "error"
                }
            
            return {
                "message": "Error saving Google Calendar credentials",
                "error": error_details,
                "status": "error"
            }
    except Exception as e:
        logger.error(f"Error saving Google Calendar credentials: {str(e)}")
        
        return {
            "message": "Error saving Google Calendar credentials",
            "error": str(e),
            "status": "error"
        } 