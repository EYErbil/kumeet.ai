import os
import msal
import requests
from datetime import datetime, timedelta
from typing import List, Optional

from models.calendar_event import CalendarEvent, Attendee
from models.calendar_credentials import OutlookCredentials
from utils.logger import setup_logger
from config.calendar import OUTLOOK_CLIENT_ID, OUTLOOK_TENANT_ID, OUTLOOK_REDIRECT_URI

logger = setup_logger(__name__)

# Microsoft Graph API endpoints
GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0'
AUTHORITY = 'https://login.microsoftonline.com/'

# Microsoft Graph API scopes
SCOPES = [
    'Calendars.ReadWrite',
    'User.Read'
]

class OutlookCalendarService:
    def __init__(self):
        self.client_id = OUTLOOK_CLIENT_ID
        self.tenant_id = OUTLOOK_TENANT_ID
        self.redirect_uri = OUTLOOK_REDIRECT_URI
        
        if not all([self.client_id, self.tenant_id, self.redirect_uri]):
            logger.error("Outlook Calendar credentials not properly configured")
            raise ValueError("Outlook Calendar credentials not properly configured")
    
    def get_authorization_url(self) -> str:
        """Generate the authorization URL for Outlook Calendar OAuth flow."""
        app = msal.PublicClientApplication(
            client_id=self.client_id,
            authority=f"{AUTHORITY}{self.tenant_id}"
        )
        
        authorization_url = app.get_authorization_request_url(
            scopes=SCOPES,
            redirect_uri=self.redirect_uri,
            prompt="select_account"
        )
        
        return authorization_url
    
    def exchange_code_for_tokens(self, code: str) -> OutlookCredentials:
        """Exchange authorization code for access and refresh tokens."""
        app = msal.PublicClientApplication(
            client_id=self.client_id,
            authority=f"{AUTHORITY}{self.tenant_id}"
        )
        
        try:
            result = app.acquire_token_by_authorization_code(
                code=code,
                scopes=SCOPES,
                redirect_uri=self.redirect_uri
            )
            
            if "error" in result:
                logger.error(f"Error exchanging code for tokens: {result.get('error_description')}")
                raise ValueError(f"Error exchanging code for tokens: {result.get('error_description')}")
            
            # Calculate token expiry
            token_expiry = datetime.now() + timedelta(seconds=result.get('expires_in', 3600))
            
            return OutlookCredentials(
                user_id="",  # This will be set by the caller
                calendar_type="outlook",
                access_token=result.get('access_token'),
                refresh_token=result.get('refresh_token'),
                token_expiry=token_expiry,
                client_id=self.client_id,
                tenant_id=self.tenant_id,
                scopes=SCOPES
            )
        except Exception as e:
            logger.error(f"Error exchanging code for tokens: {str(e)}")
            raise
    
    def refresh_token(self, credentials: OutlookCredentials) -> OutlookCredentials:
        """Refresh the access token using the refresh token."""
        app = msal.PublicClientApplication(
            client_id=credentials.client_id,
            authority=f"{AUTHORITY}{credentials.tenant_id}"
        )
        
        try:
            result = app.acquire_token_by_refresh_token(
                refresh_token=credentials.refresh_token,
                scopes=credentials.scopes
            )
            
            if "error" in result:
                logger.error(f"Error refreshing token: {result.get('error_description')}")
                raise ValueError(f"Error refreshing token: {result.get('error_description')}")
            
            # Calculate token expiry
            token_expiry = datetime.now() + timedelta(seconds=result.get('expires_in', 3600))
            
            # Update credentials
            credentials.access_token = result.get('access_token')
            credentials.refresh_token = result.get('refresh_token', credentials.refresh_token)
            credentials.token_expiry = token_expiry
            credentials.updated_at = datetime.now()
            
            return credentials
        except Exception as e:
            logger.error(f"Error refreshing token: {str(e)}")
            raise
    
    def _get_headers(self, credentials: OutlookCredentials) -> dict:
        """Get headers for Microsoft Graph API requests."""
        return {
            'Authorization': f'Bearer {credentials.access_token}',
            'Content-Type': 'application/json'
        }
    
    def create_event(self, credentials: OutlookCredentials, event: CalendarEvent) -> str:
        """Create a new event in Outlook Calendar."""
        # Format attendees
        attendees = []
        if event.attendees:
            for attendee in event.attendees:
                attendees.append({
                    "emailAddress": {
                        "address": attendee.email,
                        "name": attendee.name or attendee.email
                    },
                    "type": "required"
                })
        
        # Create event body
        event_body = {
            "subject": event.title,
            "body": {
                "contentType": "HTML",
                "content": event.description or ""
            },
            "start": {
                "dateTime": event.start_time.isoformat(),
                "timeZone": "UTC"
            },
            "end": {
                "dateTime": event.end_time.isoformat(),
                "timeZone": "UTC"
            },
            "location": {
                "displayName": event.location or ""
            },
            "attendees": attendees
        }
        
        try:
            response = requests.post(
                f"{GRAPH_API_ENDPOINT}/me/events",
                headers=self._get_headers(credentials),
                json=event_body
            )
            
            response.raise_for_status()
            created_event = response.json()
            return created_event.get('id')
        except requests.exceptions.RequestException as e:
            logger.error(f"Error creating Outlook Calendar event: {str(e)}")
            raise
    
    def update_event(self, credentials: OutlookCredentials, event: CalendarEvent) -> bool:
        """Update an existing event in Outlook Calendar."""
        if not event.calendar_event_id:
            logger.error("Cannot update event without calendar_event_id")
            raise ValueError("Cannot update event without calendar_event_id")
        
        # Format attendees
        attendees = []
        if event.attendees:
            for attendee in event.attendees:
                attendees.append({
                    "emailAddress": {
                        "address": attendee.email,
                        "name": attendee.name or attendee.email
                    },
                    "type": "required"
                })
        
        # Create event body
        event_body = {
            "subject": event.title,
            "body": {
                "contentType": "HTML",
                "content": event.description or ""
            },
            "start": {
                "dateTime": event.start_time.isoformat(),
                "timeZone": "UTC"
            },
            "end": {
                "dateTime": event.end_time.isoformat(),
                "timeZone": "UTC"
            },
            "location": {
                "displayName": event.location or ""
            },
            "attendees": attendees
        }
        
        try:
            response = requests.patch(
                f"{GRAPH_API_ENDPOINT}/me/events/{event.calendar_event_id}",
                headers=self._get_headers(credentials),
                json=event_body
            )
            
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Error updating Outlook Calendar event: {str(e)}")
            raise
    
    def delete_event(self, credentials: OutlookCredentials, event_id: str) -> bool:
        """Delete an event from Outlook Calendar."""
        try:
            response = requests.delete(
                f"{GRAPH_API_ENDPOINT}/me/events/{event_id}",
                headers=self._get_headers(credentials)
            )
            
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Error deleting Outlook Calendar event: {str(e)}")
            raise
    
    def get_events(self, credentials: OutlookCredentials, time_min: Optional[datetime] = None, time_max: Optional[datetime] = None) -> List[dict]:
        """Get events from Outlook Calendar within a time range."""
        # Default to getting events for the next 30 days if no range specified
        if not time_min:
            time_min = datetime.utcnow()
        if not time_max:
            time_max = time_min + timedelta(days=30)
        
        # Format filter query
        filter_query = f"start/dateTime ge '{time_min.isoformat()}' and end/dateTime le '{time_max.isoformat()}'"
        
        try:
            response = requests.get(
                f"{GRAPH_API_ENDPOINT}/me/events",
                headers=self._get_headers(credentials),
                params={
                    "$filter": filter_query,
                    "$orderby": "start/dateTime",
                    "$select": "id,subject,body,start,end,location,attendees"
                }
            )
            
            response.raise_for_status()
            events_result = response.json()
            return events_result.get('value', [])
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting Outlook Calendar events: {str(e)}")
            raise 