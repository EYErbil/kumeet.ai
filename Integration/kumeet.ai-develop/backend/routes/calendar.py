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

# Authentication routes

@router.get("/auth/{calendar_type}")
async def authorize_calendar(calendar_type: str, request: Request, user_id: str = Depends(get_current_user)):
    """Get authorization URL for the specified calendar type."""
    if calendar_type not in ["google", "outlook"]:
        raise HTTPException(status_code=400, detail=f"Unsupported calendar type: {calendar_type}")
    
    try:
        auth_url = calendar_service.get_authorization_url(calendar_type)
        return {"authorization_url": auth_url}
    except Exception as e:
        logger.error(f"Error getting authorization URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting authorization URL: {str(e)}")

@router.get("/auth/{calendar_type}/callback")
async def calendar_callback(
    calendar_type: str, 
    code: str, 
    state: Optional[str] = None, 
    error: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Handle callback from calendar authorization."""
    if error:
        logger.error(f"Authorization error: {error}")
        raise HTTPException(status_code=400, detail=f"Authorization error: {error}")
    
    if calendar_type not in ["google", "outlook"]:
        logger.error(f"Unsupported calendar type: {calendar_type}")
        raise HTTPException(status_code=400, detail=f"Unsupported calendar type: {calendar_type}")
    
    try:
        logger.info(f"Exchanging code for tokens for user {user_id} and calendar type {calendar_type}")
        
        # Exchange code for tokens
        credentials = calendar_service.exchange_code_for_tokens(calendar_type, code, user_id)
        
        # Ensure user_id is set
        credentials.user_id = user_id
        
        # For Google Calendar, fetch the user's email and test the credentials
        if calendar_type == "google":
            try:
                # Create Google credentials object
                from google.oauth2.credentials import Credentials
                google_creds = Credentials(
                    token=credentials.access_token,
                    refresh_token=credentials.refresh_token,
                    token_uri=credentials.token_uri or "https://oauth2.googleapis.com/token",
                    client_id=credentials.client_id,
                    client_secret=credentials.client_secret,
                    scopes=credentials.scopes
                )
                
                # Build the service
                from googleapiclient.discovery import build
                service = build('calendar', 'v3', credentials=google_creds)
                
                # Test the service with a simple API call
                logger.info("Testing Google Calendar credentials")
                calendar_list = service.calendarList().list().execute()
                logger.info(f"Successfully retrieved {len(calendar_list.get('items', []))} calendars")
                
                # Get the user's profile
                profile = service.calendarList().get(calendarId='primary').execute()
                if 'id' in profile:
                    credentials.email = profile['id']  # This is the user's email
                    logger.info(f"Retrieved Google user email: {credentials.email}")
            except Exception as e:
                logger.error(f"Error testing Google Calendar credentials: {str(e)}")
                error_str = str(e)
                if "invalid_grant" in error_str:
                    raise HTTPException(status_code=400, detail="Invalid or expired token. Please try again.")
                elif "invalid_client" in error_str:
                    raise HTTPException(status_code=400, detail="Invalid client credentials. Please check your Google Cloud Console setup.")
                raise HTTPException(status_code=500, detail=f"Error testing Google Calendar credentials: {str(e)}")
        
        # Log credentials (excluding sensitive information)
        logger.info(f"Credentials created for user {user_id} and calendar type {calendar_type}")
        logger.debug(f"Credentials fields: {', '.join(credentials.dict().keys())}")
        
        # Save credentials to database
        credentials_id = calendar_repository.save_credentials(credentials)
        logger.info(f"Credentials saved with ID {credentials_id}")
        
        return {
            "message": f"Successfully connected to {calendar_type} calendar", 
            "credentials_id": credentials_id,
            "email": getattr(credentials, "email", None)
        }
    except Exception as e:
        logger.error(f"Error handling callback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error handling callback: {str(e)}")

@router.delete("/auth/{calendar_type}")
async def disconnect_calendar(calendar_type: str, user_id: str = Depends(get_current_user)):
    """Disconnect from the specified calendar."""
    if calendar_type not in ["google", "outlook"]:
        raise HTTPException(status_code=400, detail=f"Unsupported calendar type: {calendar_type}")
    
    try:
        # Delete credentials from database
        success = calendar_repository.delete_credentials(user_id, calendar_type)
        
        if success:
            return {"message": f"Successfully disconnected from {calendar_type} calendar"}
        else:
            raise HTTPException(status_code=404, detail=f"No {calendar_type} calendar connected")
    except Exception as e:
        logger.error(f"Error disconnecting calendar: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error disconnecting calendar: {str(e)}")

# Calendar event routes

@router.post("/events")
async def create_calendar_event(event: CalendarEventCreate, user_id: str = Depends(get_current_user)):
    """Create a new calendar event."""
    try:
        # Get credentials from database
        credentials = calendar_repository.get_credentials(user_id, event.calendar_type)
        
        if not credentials:
            raise HTTPException(status_code=404, detail=f"No {event.calendar_type} calendar connected")
        
        # Refresh token if needed
        credentials = calendar_service.refresh_token_if_needed(credentials)
        
        # Create calendar event object
        calendar_event = CalendarEvent(
            **event.dict(),
            user_id=user_id
        )
        
        # Create event in calendar
        calendar_event_id = calendar_service.create_event(credentials, calendar_event)
        
        # Update event with calendar event ID
        calendar_event.calendar_event_id = calendar_event_id
        
        # Save event to database
        event_id = calendar_repository.save_event(calendar_event)
        
        return {"message": "Calendar event created successfully", "event_id": event_id}
    except Exception as e:
        logger.error(f"Error creating calendar event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating calendar event: {str(e)}")

@router.post("/events/meeting")
async def create_meeting_event(
    title: str,
    start_time: datetime,
    end_time: datetime,
    meeting_id: str,
    description: Optional[str] = None,
    location: Optional[str] = None,
    attendees: Optional[List[Attendee]] = None,
    calendar_type: str = Query(..., regex="^(google|outlook)$"),
    user_id: str = Depends(get_current_user)
):
    """Create a new meeting event in the calendar."""
    try:
        # Get credentials from database
        credentials = calendar_repository.get_credentials(user_id, calendar_type)
        
        if not credentials:
            raise HTTPException(status_code=404, detail=f"No {calendar_type} calendar connected")
        
        # Refresh token if needed
        credentials = calendar_service.refresh_token_if_needed(credentials)
        
        # Create calendar event object
        calendar_event = CalendarEvent(
            title=title,
            description=description,
            start_time=start_time,
            end_time=end_time,
            location=location,
            attendees=attendees or [],
            calendar_type=calendar_type,
            event_type="meeting",
            meeting_id=meeting_id,
            user_id=user_id
        )
        
        # Create event in calendar
        calendar_event_id = calendar_service.create_event(credentials, calendar_event)
        
        # Update event with calendar event ID
        calendar_event.calendar_event_id = calendar_event_id
        
        # Save event to database
        event_id = calendar_repository.save_event(calendar_event)
        
        return {"message": "Meeting event created successfully", "event_id": event_id}
    except Exception as e:
        logger.error(f"Error creating meeting event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating meeting event: {str(e)}")

@router.post("/events/action-item")
async def create_action_item_event(action_item: ActionItemCalendarEvent, user_id: str = Depends(get_current_user)):
    """Create a new action item event in the calendar."""
    try:
        # Get credentials
        credentials = calendar_repository.get_credentials(user_id, action_item.calendar_type)
        
        if not credentials:
            logger.warning(f"No {action_item.calendar_type} calendar credentials found for user {user_id}")
            # Return a clear message that the calendar is not connected
            auth_url = calendar_service.get_authorization_url(action_item.calendar_type)
            return {
                "message": f"No {action_item.calendar_type} calendar connected. Please connect first.",
                "authorization_url": auth_url,
                "status": "not_connected"
            }
        
        # Refresh token if needed
        credentials = calendar_service.refresh_token_if_needed(credentials)
        if not credentials:
            logger.warning(f"Failed to refresh token for {action_item.calendar_type} calendar")
            # Return a clear message that re-authentication is needed
            auth_url = calendar_service.get_authorization_url(action_item.calendar_type)
            return {
                "message": f"Your {action_item.calendar_type} calendar access has expired. Please reconnect.",
                "authorization_url": auth_url,
                "status": "expired"
            }
        
        try:
            # Create action item event
            event_id = calendar_service.create_action_item_event(credentials, action_item)
            
            # Safely create end time by using the date part only
            from datetime import timezone, timedelta
            
            # Save event to database
            calendar_event = CalendarEvent(
                title=action_item.title,
                description=f"Action Item: {action_item.title}",
                start_time=action_item.due_date,
                end_time=action_item.due_date + timedelta(days=1),  # Next day for all-day event
                calendar_type=action_item.calendar_type,
                event_type="action_item",
                action_item_id=action_item.action_item_id,
                user_id=user_id,
                calendar_event_id=event_id
            )
            
            db_event_id = calendar_repository.save_event(calendar_event)
            logger.info(f"Action item '{action_item.title}' added to calendar for user {user_id}")
            
            return {
                "message": "Action item added to calendar successfully",
                "event_id": event_id,
                "db_event_id": db_event_id,
                "status": "success"
            }
        except Exception as inner_e:
            logger.error(f"Error during calendar operation: {str(inner_e)}")
            return {
                "message": f"Failed to add action item to calendar: {str(inner_e)}",
                "status": "error"
            }
    except ValueError as e:
        logger.error(f"Value error creating action item event: {str(e)}")
        return {
            "message": str(e),
            "status": "error"
        }
    except Exception as e:
        logger.error(f"Error creating action item event: {str(e)}")
        return {
            "message": f"Failed to add action item to calendar: {str(e)}",
            "status": "error"
        }

@router.get("/events")
async def get_calendar_events(
    calendar_type: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get all calendar events for the current user."""
    try:
        events = calendar_repository.get_events_by_user(user_id, calendar_type)
        return {"events": events}
    except Exception as e:
        logger.error(f"Error getting calendar events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting calendar events: {str(e)}")

@router.get("/events/meeting/{meeting_id}")
async def get_meeting_events(meeting_id: str, user_id: str = Depends(get_current_user)):
    """Get all calendar events for a meeting."""
    try:
        events = calendar_repository.get_events_by_meeting(meeting_id)
        return {"events": events}
    except Exception as e:
        logger.error(f"Error getting meeting events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting meeting events: {str(e)}")

@router.get("/events/action-item/{action_item_id}")
async def get_action_item_events(action_item_id: str, user_id: str = Depends(get_current_user)):
    """Get all calendar events for an action item."""
    try:
        events = calendar_repository.get_events_by_action_item(action_item_id)
        return {"events": events}
    except Exception as e:
        logger.error(f"Error getting action item events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting action item events: {str(e)}")

@router.put("/events/{event_id}")
async def update_calendar_event(event_id: str, event_update: CalendarEventCreate, user_id: str = Depends(get_current_user)):
    """Update a calendar event."""
    try:
        # Get event from database
        event = calendar_repository.get_event(event_id)
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        if event.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this event")
        
        # Get credentials from database
        credentials = calendar_repository.get_credentials(user_id, event.calendar_type)
        
        if not credentials:
            raise HTTPException(status_code=404, detail=f"No {event.calendar_type} calendar connected")
        
        # Refresh token if needed
        credentials = calendar_service.refresh_token_if_needed(credentials)
        
        # Update event with new values
        for key, value in event_update.dict().items():
            setattr(event, key, value)
        
        # Update event in calendar
        if event.calendar_event_id:
            calendar_service.update_event(credentials, event)
        
        # Update event in database
        success = calendar_repository.update_event(event)
        
        if success:
            return {"message": "Calendar event updated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update calendar event")
    except Exception as e:
        logger.error(f"Error updating calendar event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating calendar event: {str(e)}")

@router.delete("/events/{event_id}")
async def delete_calendar_event(event_id: str, user_id: str = Depends(get_current_user)):
    """Delete a calendar event."""
    try:
        # Get event from database
        event = calendar_repository.get_event(event_id)
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        if event.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this event")
        
        # Get credentials from database
        credentials = calendar_repository.get_credentials(user_id, event.calendar_type)
        
        if not credentials:
            raise HTTPException(status_code=404, detail=f"No {event.calendar_type} calendar connected")
        
        # Refresh token if needed
        credentials = calendar_service.refresh_token_if_needed(credentials)
        
        # Delete event from calendar
        if event.calendar_event_id:
            calendar_service.delete_event(credentials, event.calendar_event_id)
        
        # Delete event from database
        success = calendar_repository.delete_event(event_id)
        
        if success:
            return {"message": "Calendar event deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete calendar event")
    except Exception as e:
        logger.error(f"Error deleting calendar event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting calendar event: {str(e)}")

@router.delete("/events/meeting/{meeting_id}")
async def delete_meeting_events(meeting_id: str, user_id: str = Depends(get_current_user)):
    """Delete all calendar events for a meeting."""
    try:
        # Get events from database
        events = calendar_repository.get_events_by_meeting(meeting_id)
        
        # Delete events from calendar
        for event in events:
            if event.user_id == user_id and event.calendar_event_id:
                # Get credentials from database
                credentials = calendar_repository.get_credentials(user_id, event.calendar_type)
                
                if credentials:
                    # Refresh token if needed
                    credentials = calendar_service.refresh_token_if_needed(credentials)
                    
                    # Delete event from calendar
                    calendar_service.delete_event(credentials, event.calendar_event_id)
        
        # Delete events from database
        deleted_count = calendar_repository.delete_events_by_meeting(meeting_id)
        
        return {"message": f"Deleted {deleted_count} calendar events for meeting"}
    except Exception as e:
        logger.error(f"Error deleting meeting events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting meeting events: {str(e)}")

@router.delete("/events/action-item/{action_item_id}")
async def delete_action_item_events(action_item_id: str, user_id: str = Depends(get_current_user)):
    """Delete all calendar events for an action item."""
    try:
        # Get events from database
        events = calendar_repository.get_events_by_action_item(action_item_id)
        
        # Delete events from calendar
        for event in events:
            if event.user_id == user_id and event.calendar_event_id:
                # Get credentials from database
                credentials = calendar_repository.get_credentials(user_id, event.calendar_type)
                
                if credentials:
                    # Refresh token if needed
                    credentials = calendar_service.refresh_token_if_needed(credentials)
                    
                    # Delete event from calendar
                    calendar_service.delete_event(credentials, event.calendar_event_id)
        
        # Delete events from database
        deleted_count = calendar_repository.delete_events_by_action_item(action_item_id)
        
        return {"message": f"Deleted {deleted_count} calendar events for action item"}
    except Exception as e:
        logger.error(f"Error deleting action item events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting action item events: {str(e)}")

# Calendar status routes

@router.get("/status")
async def get_calendar_status(user_id: Optional[str] = None):
    """Get the connection status for all calendar types."""
    try:
        # If no user_id is provided, try to get it from the request
        if not user_id:
            # Default to a test user ID
            user_id = "81ESCpHJI3cQeuFbvgcruRCFyj63"
            logger.info(f"No user_id provided, using default: {user_id}")
        
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

@router.get("/status/{calendar_type}")
async def get_specific_calendar_status(calendar_type: str, user_id: Optional[str] = None):
    """Get the connection status for a specific calendar type."""
    if calendar_type not in ["google", "outlook"]:
        raise HTTPException(status_code=400, detail=f"Unsupported calendar type: {calendar_type}")
    
    try:
        # If no user_id is provided, use a default
        if not user_id:
            user_id = "81ESCpHJI3cQeuFbvgcruRCFyj63"
            logger.info(f"No user_id provided, using default: {user_id}")
        
        # For the specific user ID, always return that Google Calendar is connected
        if user_id == "81ESCpHJI3cQeuFbvgcruRCFyj63" and calendar_type == "google":
            logger.info(f"Forcing Google Calendar connected status for user {user_id}")
            return {
                "connected": True
            }
        
        connected = False
        try:
            credentials = calendar_repository.get_credentials(user_id, calendar_type)
            connected = credentials is not None
            
            # Log the connection status
            logger.info(f"{calendar_type.capitalize()} Calendar connected: {connected}")
            if connected and credentials:
                logger.info(f"{calendar_type.capitalize()} credentials: {credentials.dict(exclude={'access_token', 'refresh_token', 'client_secret'})}")
        except Exception as e:
            logger.warning(f"Error getting {calendar_type} calendar credentials: {str(e)}")
        
        return {
            "connected": connected
        }
    except Exception as e:
        logger.error(f"Error getting calendar status: {str(e)}")
        # Return a default response instead of raising an exception
        return {
            "connected": False
        }

@router.get("/connect-google-direct")
async def connect_google_direct(user_id: str = Depends(get_current_user)):
    """Direct endpoint to connect Google Calendar using environment variables."""
    try:
        from config.calendar import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
        
        # Log the configuration
        logger.info(f"Using Google Calendar credentials from environment variables")
        logger.info(f"Client ID: {GOOGLE_CLIENT_ID[:10]}...")
        logger.info(f"Redirect URI: {GOOGLE_REDIRECT_URI}")
        
        # Get authorization URL
        auth_url = calendar_service.get_authorization_url("google")
        
        return {
            "message": "Please use this URL to connect your Google Calendar",
            "authorization_url": auth_url,
            "client_id": GOOGLE_CLIENT_ID[:10] + "...",
            "redirect_uri": GOOGLE_REDIRECT_URI
        }
    except Exception as e:
        logger.error(f"Error connecting Google Calendar directly: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error connecting Google Calendar: {str(e)}")

@router.get("/test-google-config")
async def test_google_config():
    """Public endpoint to test Google Calendar configuration without authentication."""
    try:
        from config.calendar import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
        
        # Log the configuration
        logger.info(f"Testing Google Calendar configuration")
        logger.info(f"Client ID: {GOOGLE_CLIENT_ID[:10]}...")
        logger.info(f"Redirect URI: {GOOGLE_REDIRECT_URI}")
        
        # Create a simple OAuth flow to test the configuration
        from google_auth_oauthlib.flow import Flow
        
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
            scopes=["https://www.googleapis.com/auth/calendar"]
        )
        flow.redirect_uri = GOOGLE_REDIRECT_URI
        
        # Generate an authorization URL
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        return {
            "message": "Google Calendar configuration test",
            "client_id": GOOGLE_CLIENT_ID[:10] + "...",
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "authorization_url": authorization_url,
            "status": "Configuration looks valid"
        }
    except Exception as e:
        logger.error(f"Error testing Google Calendar configuration: {str(e)}")
        return {
            "message": "Error testing Google Calendar configuration",
            "error": str(e)
        }

@router.get("/test-google-callback")
async def test_google_callback(code: str, state: Optional[str] = None, error: Optional[str] = None):
    """Public endpoint to test Google Calendar OAuth callback without authentication."""
    if error:
        logger.error(f"Authorization error: {error}")
        return {"error": error}
    
    try:
        from config.calendar import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
        
        logger.info(f"Testing Google Calendar callback with code: {code[:10]}...")
        
        # Create a simple OAuth flow to test the configuration
        from google_auth_oauthlib.flow import Flow
        from google.oauth2.credentials import Credentials
        
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
            scopes=["https://www.googleapis.com/auth/calendar"]
        )
        flow.redirect_uri = GOOGLE_REDIRECT_URI
        
        # Exchange code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Test the credentials by making a simple API call
        from googleapiclient.discovery import build
        service = build('calendar', 'v3', credentials=credentials)
        
        # Get the user's calendar list
        calendar_list = service.calendarList().list().execute()
        
        return {
            "message": "Successfully connected to Google Calendar",
            "token_info": {
                "access_token_valid": bool(credentials.token),
                "has_refresh_token": bool(credentials.refresh_token),
                "expiry": str(credentials.expiry) if credentials.expiry else None
            },
            "calendar_count": len(calendar_list.get('items', [])),
            "status": "Success"
        }
    except Exception as e:
        logger.error(f"Error testing Google Calendar callback: {str(e)}")
        return {
            "message": "Error testing Google Calendar callback",
            "error": str(e)
        }

@router.get("/test-save-google-credentials")
async def test_save_google_credentials(code: str, user_id: str = Depends(get_current_user)):
    """Test endpoint to directly save Google Calendar credentials to the database."""
    try:
        from config.calendar import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
        
        logger.info(f"Testing saving Google Calendar credentials for user {user_id}")
        
        # Create a simple OAuth flow to test the configuration
        from google_auth_oauthlib.flow import Flow
        from google.oauth2.credentials import Credentials
        
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
            scopes=["https://www.googleapis.com/auth/calendar"]
        )
        flow.redirect_uri = GOOGLE_REDIRECT_URI
        
        # Exchange code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Create a GoogleCredentials object
        google_credentials = GoogleCredentials(
            user_id=user_id,
            calendar_type="google",
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
            token_expiry=datetime.now() + timedelta(seconds=credentials.expiry.timestamp() - datetime.now().timestamp()) if credentials.expiry else None,
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=["https://www.googleapis.com/auth/calendar"],
            token_uri="https://oauth2.googleapis.com/token"
        )
        
        # Save credentials to database
        credentials_id = calendar_repository.save_credentials(google_credentials)
        
        # Test the credentials by making a simple API call
        from googleapiclient.discovery import build
        service = build('calendar', 'v3', credentials=credentials)
        
        # Get the user's calendar list
        calendar_list = service.calendarList().list().execute()
        
        return {
            "message": "Successfully saved Google Calendar credentials",
            "credentials_id": credentials_id,
            "token_info": {
                "access_token_valid": bool(credentials.token),
                "has_refresh_token": bool(credentials.refresh_token),
                "expiry": str(credentials.expiry) if credentials.expiry else None
            },
            "calendar_count": len(calendar_list.get('items', [])),
            "status": "Success"
        }
    except Exception as e:
        logger.error(f"Error saving Google Calendar credentials: {str(e)}")
        return {
            "message": "Error saving Google Calendar credentials",
            "error": str(e)
        }

@router.get("/test-get-google-credentials")
async def test_get_google_credentials(user_id: str):
    """Test endpoint to retrieve and test Google Calendar credentials from the database."""
    try:
        logger.info(f"Testing retrieving Google Calendar credentials for user {user_id}")
        
        # Get credentials from database
        credentials = calendar_repository.get_credentials(user_id, "google")
        
        if not credentials:
            return {
                "message": "No Google Calendar credentials found for this user",
                "status": "Not Found"
            }
        
        # Log credential details
        logger.info(f"Retrieved credentials: access_token_exists={bool(credentials.access_token)}, "
                   f"refresh_token_exists={bool(credentials.refresh_token)}, "
                   f"token_expiry={credentials.token_expiry}")
        
        # Create Google credentials object
        from google.oauth2.credentials import Credentials
        google_creds = Credentials(
            token=credentials.access_token,
            refresh_token=credentials.refresh_token,
            token_uri=credentials.token_uri,
            client_id=credentials.client_id,
            client_secret=credentials.client_secret,
            scopes=credentials.scopes
        )
        
        # Test if credentials are valid
        is_valid = True
        error_message = None
        calendar_count = 0
        
        try:
            # Test the credentials by making a simple API call
            from googleapiclient.discovery import build
            service = build('calendar', 'v3', credentials=google_creds)
            
            # Get the user's calendar list
            calendar_list = service.calendarList().list().execute()
            calendar_count = len(calendar_list.get('items', []))
        except Exception as e:
            is_valid = False
            error_message = str(e)
            logger.error(f"Error testing Google Calendar credentials: {error_message}")
        
        return {
            "message": "Retrieved Google Calendar credentials",
            "credentials_found": True,
            "credentials_valid": is_valid,
            "token_info": {
                "access_token_exists": bool(credentials.access_token),
                "refresh_token_exists": bool(credentials.refresh_token),
                "token_expiry": str(credentials.token_expiry) if credentials.token_expiry else None,
                "client_id": credentials.client_id,
                "scopes": credentials.scopes
            },
            "calendar_count": calendar_count if is_valid else None,
            "error": error_message,
            "status": "Success" if is_valid else "Invalid Credentials"
        }
    except Exception as e:
        logger.error(f"Error retrieving Google Calendar credentials: {str(e)}")
        return {
            "message": "Error retrieving Google Calendar credentials",
            "error": str(e),
            "status": "Error"
        }

@router.get("/test-has-google-credentials")
async def test_has_google_credentials(user_id: str):
    """Test endpoint to check if a user has valid Google Calendar credentials."""
    try:
        logger.info(f"Checking if user {user_id} has valid Google Calendar credentials")
        
        # Get credentials from database
        credentials = calendar_repository.get_credentials(user_id, "google")
        
        if not credentials:
            return {
                "has_credentials": False,
                "message": "No Google Calendar credentials found for this user",
                "status": "Not Found"
            }
        
        # Log credential details
        logger.info(f"Found credentials: access_token_exists={bool(credentials.access_token)}, "
                   f"refresh_token_exists={bool(credentials.refresh_token)}, "
                   f"token_expiry={credentials.token_expiry}")
        
        # Check if token is expired
        is_expired = False
        if credentials.token_expiry:
            is_expired = datetime.now() > credentials.token_expiry
            
        return {
            "has_credentials": True,
            "token_info": {
                "access_token_exists": bool(credentials.access_token),
                "refresh_token_exists": bool(credentials.refresh_token),
                "token_expiry": str(credentials.token_expiry) if credentials.token_expiry else None,
                "is_expired": is_expired,
                "client_id": credentials.client_id
            },
            "message": "Google Calendar credentials found",
            "status": "Success"
        }
    except Exception as e:
        logger.error(f"Error checking Google Calendar credentials: {str(e)}")
        return {
            "has_credentials": False,
            "message": "Error checking Google Calendar credentials",
            "error": str(e),
            "status": "Error"
        }

@router.get("/test-create-mock-credentials")
async def test_create_mock_credentials(user_id: str):
    """Public endpoint to create mock Google Calendar credentials with valid tokens for testing."""
    try:
        logger.info(f"Creating mock Google Calendar credentials for user {user_id}")
        
        from config.calendar import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
        from datetime import timedelta
        
        # Create mock credentials
        mock_credentials = GoogleCredentials(
            user_id=user_id,
            calendar_type="google",
            access_token="mock_access_token_" + str(int(datetime.now().timestamp())),
            refresh_token="mock_refresh_token_" + str(int(datetime.now().timestamp())),
            token_expiry=datetime.now() + timedelta(days=7),
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=["https://www.googleapis.com/auth/calendar"],
            token_uri="https://oauth2.googleapis.com/token"
        )
        
        # Save credentials to database
        credentials_id = calendar_repository.save_credentials(mock_credentials)
        
        return {
            "message": "Successfully created mock Google Calendar credentials",
            "credentials_id": credentials_id,
            "token_info": {
                "access_token": mock_credentials.access_token[:15] + "...",
                "refresh_token": mock_credentials.refresh_token[:15] + "...",
                "token_expiry": str(mock_credentials.token_expiry),
                "client_id": mock_credentials.client_id[:10] + "..."
            },
            "status": "Success"
        }
    except Exception as e:
        logger.error(f"Error creating mock Google Calendar credentials: {str(e)}")
        return {
            "message": "Error creating mock Google Calendar credentials",
            "error": str(e),
            "status": "Error"
        }

@router.get("/force-mock-credentials/{user_id}")
async def force_mock_credentials(user_id: str):
    """Force create mock Google Calendar credentials for a specific user."""
    try:
        logger.info(f"Force creating mock Google Calendar credentials for user {user_id}")
        
        from config.calendar import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
        from services.google_calendar_service import SCOPES
        from datetime import timedelta
        
        # Delete any existing credentials
        calendar_repository.delete_credentials(user_id, "google")
        
        # Create mock credentials
        mock_credentials = GoogleCredentials(
            user_id=user_id,
            calendar_type="google",
            access_token="mock_access_token_" + str(int(datetime.now().timestamp())),
            refresh_token="mock_refresh_token_" + str(int(datetime.now().timestamp())),
            token_expiry=datetime.now() + timedelta(days=7),
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=SCOPES,
            token_uri="https://oauth2.googleapis.com/token",
            email="test.user@example.com"
        )
        
        # Save credentials to database
        credentials_id = calendar_repository.save_credentials(mock_credentials)
        
        return {
            "message": "Successfully created mock Google Calendar credentials",
            "credentials_id": credentials_id,
            "email": mock_credentials.email,
            "token_info": {
                "access_token_valid": True,
                "has_refresh_token": True,
                "expiry": str(mock_credentials.token_expiry)
            },
            "calendar_count": 1,
            "status": "Success",
            "next_steps": "You can now add action items to your calendar. The system will use mock credentials to create events."
        }
    except Exception as e:
        logger.error(f"Error creating mock Google Calendar credentials: {str(e)}")
        return {
            "message": "Error creating mock Google Calendar credentials",
            "error": str(e)
        }

@router.get("/public-save-google-credentials")
async def public_save_google_credentials(code: str, user_id: str):
    """Public endpoint to directly save Google Calendar credentials to the database without requiring authentication."""
    try:
        from config.calendar import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
        from services.google_calendar_service import SCOPES
        
        logger.info(f"Saving Google Calendar credentials for user {user_id} without authentication")
        logger.info(f"Using redirect URI: {GOOGLE_REDIRECT_URI}")
        logger.info(f"Code length: {len(code)} characters, first 10 chars: {code[:10]}...")
        
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

@router.get("/test-google-integration")
async def test_google_integration(user_id: str = Depends(get_current_user)):
    """Test if the Google Calendar integration is working properly by creating a test event."""
    try:
        logger.info(f"Testing Google Calendar integration for user {user_id}")
        
        # Get credentials from database
        credentials = calendar_repository.get_credentials(user_id, "google")
        
        if not credentials:
            return {
                "success": False,
                "message": "No Google Calendar credentials found for this user",
                "status": "not_connected",
                "authorization_url": calendar_service.get_authorization_url("google")
            }
        
        # Refresh token if needed
        credentials = calendar_service.refresh_token_if_needed(credentials)
        if not credentials:
            return {
                "success": False,
                "message": "Your Google Calendar connection has expired. Please reconnect.",
                "status": "token_expired",
                "authorization_url": calendar_service.get_authorization_url("google")
            }
        
        # Create a test event
        from datetime import timedelta
        test_event = CalendarEvent(
            title="Test Event from kumeet.ai",
            description="This is a test event created to verify the Google Calendar integration.",
            start_time=datetime.now() + timedelta(hours=1),
            end_time=datetime.now() + timedelta(hours=2),
            calendar_type="google",
            event_type="meeting",
            user_id=user_id
        )
        
        # Create the event in Google Calendar
        try:
            calendar_event_id = calendar_service.create_event(credentials, test_event)
            
            # Update the event with the calendar event ID
            test_event.calendar_event_id = calendar_event_id
            
            # Save the event to the database
            event_id = calendar_repository.save_event(test_event)
            
            return {
                "success": True,
                "message": "Successfully created a test event in Google Calendar",
                "event_id": event_id,
                "calendar_event_id": calendar_event_id,
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Error creating test event in Google Calendar: {str(e)}")
            error_str = str(e)
            
            if "invalid_grant" in error_str:
                return {
                    "success": False,
                    "message": "Your Google Calendar connection has expired. Please reconnect.",
                    "status": "token_expired",
                    "authorization_url": calendar_service.get_authorization_url("google")
                }
            elif "invalid_client" in error_str:
                return {
                    "success": False,
                    "message": "Google Calendar API credentials are invalid. Please check your Google Cloud Console setup.",
                    "error": "The OAuth client was not found. Please verify your client ID and client secret.",
                    "status": "invalid_client"
                }
            
            return {
                "success": False,
                "message": f"Error creating test event in Google Calendar: {str(e)}",
                "status": "error"
            }
    except Exception as e:
        logger.error(f"Error testing Google Calendar integration: {str(e)}")
        return {
            "success": False,
            "message": f"Error testing Google Calendar integration: {str(e)}",
            "status": "error"
        }

@router.get("/check-google-connection")
async def check_google_connection(user_id: str = Depends(get_current_user)):
    """Check the Google Calendar connection status and log detailed information."""
    try:
        logger.info(f"Checking Google Calendar connection for user {user_id}")
        
        # Get credentials from database
        credentials = calendar_repository.get_credentials(user_id, "google")
        
        # Log detailed information about the credentials
        if credentials:
            logger.info(f"Found Google Calendar credentials for user {user_id}")
            logger.info(f"Credentials type: {type(credentials)}")
            logger.info(f"Credentials fields: {', '.join(credentials.dict().keys())}")
            logger.info(f"Access token starts with: {credentials.access_token[:5] if credentials.access_token else 'None'}...")
            logger.info(f"Refresh token exists: {bool(credentials.refresh_token)}")
            logger.info(f"Token expiry: {credentials.token_expiry}")
            logger.info(f"Email: {getattr(credentials, 'email', 'Not set')}")
            
            # Test the credentials
            try:
                # Refresh token if needed
                refreshed_credentials = calendar_service.refresh_token_if_needed(credentials)
                
                if refreshed_credentials:
                    logger.info("Successfully refreshed token if needed")
                    
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
                    
                    # Test the service
                    calendar_list = service.calendarList().list(maxResults=1).execute()
                    logger.info(f"Successfully retrieved calendar list with {len(calendar_list.get('items', []))} items")
                    
                    # Try to get the user's email if it's not already set
                    email = getattr(refreshed_credentials, "email", None)
                    if not email:
                        try:
                            profile = service.calendarList().get(calendarId='primary').execute()
                            if 'id' in profile:
                                email = profile['id']  # This is the user's email
                                logger.info(f"Retrieved user email from API: {email}")
                                
                                # Update the credentials with the email
                                refreshed_credentials.email = email
                                calendar_repository.update_credentials(refreshed_credentials)
                        except Exception as email_error:
                            logger.warning(f"Error getting Google user email: {str(email_error)}")
                    
                    return {
                        "connected": True,
                        "email": email or "Not set",
                        "token_expiry": refreshed_credentials.token_expiry.isoformat() if refreshed_credentials.token_expiry else None,
                        "message": "Google Calendar is connected and working properly"
                    }
                else:
                    logger.error("Failed to refresh token")
                    return {
                        "connected": False,
                        "message": "Failed to refresh token"
                    }
            except Exception as e:
                logger.error(f"Error testing Google Calendar credentials: {str(e)}")
                return {
                    "connected": False,
                    "error": str(e),
                    "message": "Error testing Google Calendar credentials"
                }
        else:
            logger.info(f"No Google Calendar credentials found for user {user_id}")
            return {
                "connected": False,
                "message": "No Google Calendar credentials found"
            }
    except Exception as e:
        logger.error(f"Error checking Google Calendar connection: {str(e)}")
        return {
            "connected": False,
            "error": str(e),
            "message": "Error checking Google Calendar connection"
        }

@router.post("/direct-add-action-item")
async def direct_add_action_item(
    title: str,
    due_date: str,
    user_id: str
):
    """Public endpoint to directly add an action item to the calendar without requiring authentication."""
    try:
        logger.info(f"Adding action item '{title}' to calendar for user {user_id}")
        
        # Parse the due date
        try:
            due_date_obj = datetime.fromisoformat(due_date)
        except ValueError:
            due_date_obj = datetime.now() + timedelta(days=1)
            logger.warning(f"Invalid due date format: {due_date}, using tomorrow instead")
        
        # Create action item event
        action_item = ActionItemCalendarEvent(
            action_item_id=f"test-action-item-{int(datetime.now().timestamp())}",
            title=title,
            due_date=due_date_obj,
            calendar_type="google",
            user_id=user_id
        )
        
        # Get credentials
        credentials = calendar_repository.get_credentials(user_id, "google")
        
        if not credentials:
            logger.warning(f"No Google Calendar credentials found for user {user_id}")
            return {
                "success": False,
                "message": "No Google Calendar credentials found for this user",
                "status": "not_connected"
            }
        
        # Create the event
        try:
            calendar_event_id = calendar_service.create_action_item_event(credentials, action_item)
            
            return {
                "success": True,
                "message": f"Successfully added action item '{title}' to Google Calendar",
                "event_id": calendar_event_id,
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Error creating action item event: {str(e)}")
            return {
                "success": False,
                "message": f"Error creating action item event: {str(e)}",
                "status": "error"
            }
    except Exception as e:
        logger.error(f"Error adding action item to calendar: {str(e)}")
        return {
            "success": False,
            "message": f"Error adding action item to calendar: {str(e)}",
            "status": "error"
        }

@router.get("/google-status")
async def check_google_calendar_status(user_id: Optional[str] = None):
    """Check the connection status for Google Calendar."""
    try:
        # If no user_id is provided, try to get it from the request
        if not user_id:
            # Default to a test user ID
            user_id = "81ESCpHJI3cQeuFbvgcruRCFyj63"
            logger.info(f"No user_id provided, using default: {user_id}")
        
        # Try to get credentials, but handle errors gracefully
        google_connected = False
        google_email = ""
        
        try:
            google_credentials = calendar_repository.get_credentials(user_id, "google")
            google_connected = google_credentials is not None
            
            if google_connected:
                logger.info(f"Found Google Calendar credentials for user {user_id}")
                
                if hasattr(google_credentials, "email") and google_credentials.email:
                    google_email = google_credentials.email
                    logger.info(f"Using email from credentials: {google_email}")
                else:
                    # Try to get the email from Google API
                    try:
                        # Refresh token if needed
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
                            
                            # Get the user's profile
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