from typing import List, Optional, Union, Literal
from datetime import datetime, timedelta

from models.calendar_event import CalendarEvent, ActionItemCalendarEvent
from models.calendar_credentials import CalendarCredentials, GoogleCredentials, OutlookCredentials
from services.google_calendar_service import GoogleCalendarService
from services.outlook_calendar_service import OutlookCalendarService
from utils.logger import setup_logger

logger = setup_logger(__name__)

class CalendarService:
    def __init__(self):
        self.google_service = GoogleCalendarService()
        self.outlook_service = OutlookCalendarService()
    
    def get_authorization_url(self, calendar_type: Literal["google", "outlook"]) -> str:
        """Get the authorization URL for the specified calendar type."""
        if calendar_type == "google":
            return self.google_service.get_authorization_url()
        elif calendar_type == "outlook":
            return self.outlook_service.get_authorization_url()
        else:
            raise ValueError(f"Unsupported calendar type: {calendar_type}")
    
    def exchange_code_for_tokens(self, calendar_type: Literal["google", "outlook"], code: str, user_id: str) -> CalendarCredentials:
        """Exchange authorization code for access and refresh tokens."""
        if calendar_type == "google":
            credentials = self.google_service.exchange_code_for_tokens(code)
            credentials.user_id = user_id
            return credentials
        elif calendar_type == "outlook":
            credentials = self.outlook_service.exchange_code_for_tokens(code)
            credentials.user_id = user_id
            return credentials
        else:
            raise ValueError(f"Unsupported calendar type: {calendar_type}")
    
    def create_event(self, credentials: CalendarCredentials, event: CalendarEvent) -> str:
        """Create a new event in the specified calendar."""
        if credentials.calendar_type == "google":
            return self.google_service.create_event(credentials, event)
        elif credentials.calendar_type == "outlook":
            return self.outlook_service.create_event(credentials, event)
        else:
            raise ValueError(f"Unsupported calendar type: {credentials.calendar_type}")
    
    def update_event(self, credentials: CalendarCredentials, event: CalendarEvent) -> bool:
        """Update an existing event in the specified calendar."""
        if credentials.calendar_type == "google":
            return self.google_service.update_event(credentials, event)
        elif credentials.calendar_type == "outlook":
            return self.outlook_service.update_event(credentials, event)
        else:
            raise ValueError(f"Unsupported calendar type: {credentials.calendar_type}")
    
    def delete_event(self, credentials: CalendarCredentials, event_id: str) -> bool:
        """Delete an event from the specified calendar."""
        if credentials.calendar_type == "google":
            return self.google_service.delete_event(credentials, event_id)
        elif credentials.calendar_type == "outlook":
            return self.outlook_service.delete_event(credentials, event_id)
        else:
            raise ValueError(f"Unsupported calendar type: {credentials.calendar_type}")
    
    def get_events(self, credentials: CalendarCredentials, time_min: Optional[datetime] = None, time_max: Optional[datetime] = None) -> List[dict]:
        """Get events from the specified calendar within a time range."""
        if credentials.calendar_type == "google":
            return self.google_service.get_events(credentials, time_min, time_max)
        elif credentials.calendar_type == "outlook":
            return self.outlook_service.get_events(credentials, time_min, time_max)
        else:
            raise ValueError(f"Unsupported calendar type: {credentials.calendar_type}")
    
    def create_meeting_event(self, credentials: CalendarCredentials, event: CalendarEvent) -> str:
        """Create a meeting event in the specified calendar."""
        # Ensure the event is marked as a meeting
        event.event_type = "meeting"
        return self.create_event(credentials, event)
    
    def create_action_item_event(self, credentials: Union[GoogleCredentials, OutlookCredentials], action_item: ActionItemCalendarEvent) -> str:
        """Create a new action item event in the calendar."""
        if credentials.calendar_type == "google":
            return self.google_service.create_action_item_event(credentials, action_item)
        elif credentials.calendar_type == "outlook":
            return self.outlook_service.create_action_item_event(credentials, action_item)
        else:
            raise ValueError(f"Unsupported calendar type: {credentials.calendar_type}")
    
    def refresh_token_if_needed(self, credentials: CalendarCredentials) -> Optional[CalendarCredentials]:
        """Refresh the access token if it's expired or about to expire."""
        # Check if token is expired or about to expire
        if not credentials.token_expiry or datetime.now() + timedelta(minutes=5) >= credentials.token_expiry:
            logger.info("Token is expired or about to expire, refreshing...")
            
            if credentials.calendar_type == "google":
                try:
                    refreshed_credentials = self.google_service.refresh_token(credentials)
                    
                    # Update the credentials in the database
                    from services.calendar_repository import CalendarRepository
                    calendar_repository = CalendarRepository()
                    if refreshed_credentials.id:
                        success = calendar_repository.update_credentials(refreshed_credentials)
                        if success:
                            logger.info(f"Successfully updated refreshed credentials in database for user {refreshed_credentials.user_id}")
                        else:
                            logger.warning(f"Failed to update refreshed credentials in database for user {refreshed_credentials.user_id}")
                    
                    return refreshed_credentials
                except Exception as e:
                    logger.error(f"Error refreshing Google token: {str(e)}")
                    # Check if we need to re-authenticate
                    if "invalid_grant" in str(e) or "Token has been expired or revoked" in str(e):
                        logger.warning("Token refresh failed due to invalid or expired refresh token. User needs to re-authenticate.")
                    return None
            elif credentials.calendar_type == "outlook":
                try:
                    return self.outlook_service.refresh_token(credentials)
                except Exception as e:
                    logger.error(f"Error refreshing Outlook token: {str(e)}")
                    return None
            else:
                logger.error(f"Unsupported calendar type: {credentials.calendar_type}")
                return None
        
        return credentials 