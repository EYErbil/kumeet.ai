import os
from datetime import datetime, timedelta
from typing import List, Optional

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from unittest.mock import MagicMock
import requests

from models.calendar_event import CalendarEvent, Attendee, ActionItemCalendarEvent
from models.calendar_credentials import GoogleCredentials
from utils.logger import setup_logger
from config.calendar import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

logger = setup_logger(__name__)

# Google Calendar API scopes
SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
]

class GoogleCalendarService:
    def __init__(self):
        self.client_id = GOOGLE_CLIENT_ID
        self.client_secret = GOOGLE_CLIENT_SECRET
        self.redirect_uri = GOOGLE_REDIRECT_URI
        
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            logger.error("Google Calendar credentials not properly configured")
            raise ValueError("Google Calendar credentials not properly configured")
    
    def get_authorization_url(self) -> str:
        """Generate the authorization URL for Google Calendar OAuth flow."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=SCOPES
        )
        flow.redirect_uri = self.redirect_uri
        
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        return authorization_url
    
    def exchange_code_for_tokens(self, code: str) -> GoogleCredentials:
        """Exchange authorization code for access and refresh tokens."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=SCOPES
        )
        flow.redirect_uri = self.redirect_uri
        
        try:
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Calculate token expiry
            token_expiry = datetime.now() + timedelta(seconds=credentials.expiry.timestamp() - datetime.now().timestamp())
            
            return GoogleCredentials(
                user_id="",  # This will be set by the caller
                calendar_type="google",
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
                token_expiry=token_expiry,
                client_id=self.client_id,
                client_secret=self.client_secret,
                scopes=SCOPES
            )
        except Exception as e:
            logger.error(f"Error exchanging code for tokens: {str(e)}")
            raise
    
    def _get_service(self, credentials: GoogleCredentials):
        """Get a Google Calendar API service instance."""
        try:
            # Check if we're using mock credentials
            if credentials.access_token and credentials.access_token.startswith("mock_access_token_"):
                logger.info("Using mock Google Calendar service")
                
                # Create a more sophisticated mock service
                mock_service = MagicMock()
                
                # Mock calendar list
                mock_calendar_list = mock_service.calendarList.return_value
                mock_calendar_list.list.return_value.execute.return_value = {
                    "items": [
                        {
                            "id": "primary",
                            "summary": "Mock Calendar",
                            "primary": True
                        }
                    ]
                }
                
                # Mock events
                mock_events = mock_service.events.return_value
                
                # Mock insert method
                mock_insert = mock_events.insert.return_value
                mock_insert.execute.return_value = {
                    "id": "mock_event_id_" + str(int(datetime.now().timestamp())),
                    "htmlLink": "https://calendar.google.com/calendar/event?eid=mock",
                    "status": "confirmed"
                }
                
                logger.info("Successfully created mock Google Calendar service")
                return mock_service
            
            # Log token information (without revealing sensitive data)
            logger.info(f"Creating Google credentials with token_expiry: {credentials.token_expiry}")
            logger.info(f"Access token starts with: {credentials.access_token[:5] if credentials.access_token else 'None'}...")
            logger.info(f"Refresh token exists: {bool(credentials.refresh_token)}")
            
            # Create Google credentials object
            google_creds = Credentials(
                token=credentials.access_token,
                refresh_token=credentials.refresh_token,
                token_uri=credentials.token_uri or "https://oauth2.googleapis.com/token",
                client_id=credentials.client_id,
                client_secret=credentials.client_secret,
                scopes=credentials.scopes
            )
            
            # Build the service
            logger.info("Using real Google Calendar service")
            service = build('calendar', 'v3', credentials=google_creds)
            
            # Test the service with a simple API call
            try:
                # Try to get the calendar list to verify the credentials work
                service.calendarList().list(maxResults=1).execute()
                logger.info("Successfully verified Google Calendar credentials")
            except Exception as e:
                logger.error(f"Error verifying Google Calendar credentials: {str(e)}")
                # Re-raise the exception to be caught by the outer try/except
                raise
                
            return service
        except Exception as e:
            logger.error(f"Error getting Google Calendar service: {str(e)}")
            
            # Check for specific error types
            error_str = str(e)
            if "invalid_grant" in error_str or "Token has been expired or revoked" in error_str:
                logger.error("Invalid grant error - token is invalid or expired")
                raise ValueError("Your Google Calendar access has expired. Please reconnect your account.")
            elif "invalid_client" in error_str:
                logger.error("Invalid client error - client ID or secret is incorrect")
                raise ValueError("Invalid client credentials. Please check your Google Cloud Console setup.")
            
            # Raise the original exception
            raise
    
    def create_event(self, credentials: GoogleCredentials, event: CalendarEvent) -> str:
        """Create a new event in Google Calendar."""
        service = self._get_service(credentials)
        
        # Format attendees
        attendees = [{"email": attendee.email} for attendee in event.attendees] if event.attendees else []
        
        # Create event body
        event_body = {
            'summary': event.title,
            'description': event.description or "",
            'start': {
                'dateTime': event.start_time.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': event.end_time.isoformat(),
                'timeZone': 'UTC',
            },
            'attendees': attendees,
            'location': event.location or "",
            'reminders': {
                'useDefault': True
            }
        }
        
        try:
            created_event = service.events().insert(calendarId='primary', body=event_body).execute()
            return created_event.get('id')
        except HttpError as e:
            logger.error(f"Error creating Google Calendar event: {str(e)}")
            raise
    
    def update_event(self, credentials: GoogleCredentials, event: CalendarEvent) -> bool:
        """Update an existing event in Google Calendar."""
        if not event.calendar_event_id:
            logger.error("Cannot update event without calendar_event_id")
            raise ValueError("Cannot update event without calendar_event_id")
        
        service = self._get_service(credentials)
        
        # Format attendees
        attendees = [{"email": attendee.email} for attendee in event.attendees] if event.attendees else []
        
        # Create event body
        event_body = {
            'summary': event.title,
            'description': event.description or "",
            'start': {
                'dateTime': event.start_time.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': event.end_time.isoformat(),
                'timeZone': 'UTC',
            },
            'attendees': attendees,
            'location': event.location or "",
            'reminders': {
                'useDefault': True
            }
        }
        
        try:
            service.events().update(
                calendarId='primary', 
                eventId=event.calendar_event_id, 
                body=event_body
            ).execute()
            return True
        except HttpError as e:
            logger.error(f"Error updating Google Calendar event: {str(e)}")
            raise
    
    def delete_event(self, credentials: GoogleCredentials, event_id: str) -> bool:
        """Delete an event from Google Calendar."""
        service = self._get_service(credentials)
        
        try:
            service.events().delete(calendarId='primary', eventId=event_id).execute()
            return True
        except HttpError as e:
            logger.error(f"Error deleting Google Calendar event: {str(e)}")
            raise
    
    def get_events(self, credentials: GoogleCredentials, time_min: Optional[datetime] = None, time_max: Optional[datetime] = None) -> List[dict]:
        """Get events from Google Calendar within a time range."""
        service = self._get_service(credentials)
        
        # Default to getting events for the next 30 days if no range specified
        if not time_min:
            time_min = datetime.utcnow()
        if not time_max:
            time_max = time_min + timedelta(days=30)
        
        try:
            events_result = service.events().list(
                calendarId='primary',
                timeMin=time_min.isoformat() + 'Z',
                timeMax=time_max.isoformat() + 'Z',
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            return events_result.get('items', [])
        except HttpError as e:
            logger.error(f"Error getting Google Calendar events: {str(e)}")
            raise
    
    def refresh_token(self, credentials: GoogleCredentials) -> GoogleCredentials:
        """Refresh the access token using the refresh token."""
        if not credentials.refresh_token:
            logger.error("Cannot refresh token without refresh_token")
            raise ValueError("Cannot refresh token without refresh_token")
        
        try:
            # Create Google credentials object
            google_creds = Credentials(
                token=credentials.access_token,
                refresh_token=credentials.refresh_token,
                token_uri=credentials.token_uri or "https://oauth2.googleapis.com/token",
                client_id=credentials.client_id,
                client_secret=credentials.client_secret,
                scopes=credentials.scopes
            )
            
            # Refresh the token
            from google.auth.transport.requests import Request
            request = Request()
            google_creds.refresh(request)
            
            # Update our credentials object
            credentials.access_token = google_creds.token
            credentials.token_expiry = datetime.now() + timedelta(seconds=google_creds.expiry.timestamp() - datetime.now().timestamp())
            credentials.updated_at = datetime.now()
            
            logger.info(f"Successfully refreshed token, new expiry: {credentials.token_expiry}")
            
            return credentials
        except Exception as e:
            logger.error(f"Error refreshing token: {str(e)}")
            raise
    
    def create_action_item_event(self, credentials: GoogleCredentials, action_item: ActionItemCalendarEvent) -> str:
        """Create a new action item event in Google Calendar."""
        try:
            service = self._get_service(credentials)
            
            # Format the due date as an all-day event
            due_date = action_item.due_date
            
            # Create event body
            event_body = {
                'summary': action_item.title,
                'description': f"Action Item: {action_item.title}",
                'start': {
                    'date': due_date.strftime('%Y-%m-%d'),
                    'timeZone': 'UTC',
                },
                'end': {
                    'date': (due_date + timedelta(days=1)).strftime('%Y-%m-%d'),
                    'timeZone': 'UTC',
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'popup', 'minutes': 1440},  # 1 day before
                        {'method': 'popup', 'minutes': 60}     # 1 hour before
                    ]
                }
            }
            
            try:
                created_event = service.events().insert(calendarId='primary', body=event_body).execute()
                logger.info(f"Successfully created action item event: {created_event.get('id')}")
                return created_event.get('id')
            except HttpError as e:
                logger.error(f"Error creating Google Calendar action item event: {str(e)}")
                # Check for specific error types
                error_str = str(e)
                if "invalid_grant" in error_str or "Token has been expired or revoked" in error_str:
                    logger.warning("Token is invalid or expired. User needs to re-authenticate.")
                    raise ValueError("Your Google Calendar access has expired. Please reconnect your account.")
                elif "invalid_client" in error_str:
                    logger.error("Invalid client credentials. Check Google Cloud Console setup.")
                    raise ValueError("Google Calendar API credentials are invalid. Please check your Google Cloud Console setup.")
                raise
        except Exception as e:
            logger.error(f"Error in create_action_item_event: {str(e)}")
            raise 