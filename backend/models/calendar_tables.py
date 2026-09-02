from psycopg2 import sql
import logging
from db import get_db_connection

# Set up logger
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# SQL statements to create calendar-related tables
CREATE_CALENDAR_CREDENTIALS_TABLE = """
CREATE TABLE IF NOT EXISTS calendar_credentials (
    credentials_id SERIAL PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
    calendar_type VARCHAR(20) NOT NULL CHECK (calendar_type IN ('google', 'outlook')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    client_id TEXT,
    client_secret TEXT,
    token_uri TEXT,
    scopes TEXT[] DEFAULT '{}',
    email VARCHAR(255),
    tenant_id TEXT,  -- For Outlook
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_calendar_type UNIQUE (user_id, calendar_type)
);
"""

CREATE_CALENDAR_EVENTS_TABLE = """
CREATE TABLE IF NOT EXISTS calendar_events (
    event_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    calendar_type VARCHAR(20) NOT NULL CHECK (calendar_type IN ('google', 'outlook')),
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('meeting', 'action_item')),
    user_id VARCHAR(128) NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
    meeting_id INTEGER REFERENCES meetings(meeting_id) ON DELETE SET NULL,
    action_item_id INTEGER REFERENCES action_items(item_id) ON DELETE SET NULL,
    calendar_event_id TEXT,  -- ID from external calendar service
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_CALENDAR_ATTENDEES_TABLE = """
CREATE TABLE IF NOT EXISTS calendar_attendees (
    attendee_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES calendar_events(event_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    response_status VARCHAR(50),
    CONSTRAINT unique_attendee_per_event UNIQUE (event_id, email)
);
"""

def init_calendar_tables():
    """
    Initialize the calendar-related database tables.
    """
    try:
        # Create tables using connection pool
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Create tables
                cursor.execute(CREATE_CALENDAR_CREDENTIALS_TABLE)
                cursor.execute(CREATE_CALENDAR_EVENTS_TABLE)
                cursor.execute(CREATE_CALENDAR_ATTENDEES_TABLE)
                
            # Commit the transaction
            conn.commit()
            
        logger.info("Calendar database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing calendar database tables: {e}")
        return False

# For manual testing/initialization
if __name__ == "__main__":
    init_calendar_tables() 