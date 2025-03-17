import os
from unittest.mock import MagicMock
from utils.logger import setup_logger

logger = setup_logger(__name__)

# Mock database for development
def get_pg_conn():
    logger.info("Using mock PostgreSQL connection for development")
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    return mock_conn

def get_db():
    logger.info("Using mock MongoDB for development")
    mock_db = MagicMock()
    
    # Mock collections
    mock_db.calendar_credentials = MagicMock()
    mock_db.calendar_events = MagicMock()
    
    # Setup mock data for calendar credentials
    mock_credentials = [
        {
            "_id": "mock_google_cred_id",
            "user_id": "mock_user_id",
            "calendar_type": "google",
            "access_token": "mock_access_token",
            "refresh_token": "mock_refresh_token",
            "token_expiry": "2023-12-31T23:59:59Z",
            "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
            "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
            "scopes": ["https://www.googleapis.com/auth/calendar"]
        }
    ]
    
    # Setup mock methods for calendar_credentials collection
    mock_db.calendar_credentials.find_one.return_value = mock_credentials[0]
    mock_db.calendar_credentials.find.return_value = mock_credentials
    
    # Setup mock data for calendar events
    mock_events = [
        {
            "_id": "mock_event_id",
            "user_id": "mock_user_id",
            "calendar_type": "google",
            "calendar_event_id": "mock_calendar_event_id",
            "title": "Mock Meeting",
            "description": "This is a mock meeting",
            "start_time": "2023-12-01T10:00:00Z",
            "end_time": "2023-12-01T11:00:00Z",
            "attendees": [
                {"email": "user@example.com", "name": "Test User"}
            ],
            "location": "Virtual",
            "event_type": "meeting"
        }
    ]
    
    # Setup mock methods for calendar_events collection
    mock_db.calendar_events.find_one.return_value = mock_events[0]
    mock_db.calendar_events.find.return_value = mock_events
    
    return mock_db
