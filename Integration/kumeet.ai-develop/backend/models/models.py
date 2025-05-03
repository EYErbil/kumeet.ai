from datetime import datetime
from psycopg2 import sql
import logging
import sys
from db import get_db_connection, execute_query, test_connection

# Set up logger
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# SQL statements to create tables
CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    firebase_uid VARCHAR(128) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_MEETINGS_TABLE = """
CREATE TABLE IF NOT EXISTS meetings (
    meeting_id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_type VARCHAR(100) NOT NULL, -- e.g., "project", "standup", "client"
    meeting_date TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    original_video_path VARCHAR(500),
    audio_path VARCHAR(500),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (firebase_uid) REFERENCES users(firebase_uid)
);
"""

CREATE_SPEAKER_SEGMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS speaker_segments (
    segment_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    speaker_label VARCHAR(50) NOT NULL, -- e.g., "speaker_0", "speaker_1"
    start_time DECIMAL(10, 3) NOT NULL, -- in seconds with millisecond precision
    end_time DECIMAL(10, 3) NOT NULL,   -- in seconds with millisecond precision
    duration DECIMAL(10, 3) NOT NULL,   -- calculated duration
    transcript TEXT,                    -- the transcribed text for this segment
    CONSTRAINT fk_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)
);
"""

CREATE_SPEAKERS_TABLE = """
CREATE TABLE IF NOT EXISTS speakers (
    speaker_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    speaker_label VARCHAR(50) NOT NULL, -- maps to speaker_segments.speaker_label
    identified_name VARCHAR(255),       -- actual person's name if identified
    CONSTRAINT fk_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id),
    CONSTRAINT unique_speaker_per_meeting UNIQUE (meeting_id, speaker_label)
);
"""

CREATE_MEETING_SUMMARIES_TABLE = """
CREATE TABLE IF NOT EXISTS meeting_summaries (
    summary_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    summary_type VARCHAR(100), -- e.g., "general", "action_items", "decisions"
    content TEXT NOT NULL,              -- the actual summary content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)
);
"""

CREATE_NOTES_TABLE = """
CREATE TABLE IF NOT EXISTS notes (
    note_id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
    meeting_id INTEGER REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id),
    CONSTRAINT fk_user FOREIGN KEY (firebase_uid) REFERENCES users(firebase_uid)
);
"""

CREATE_ACTION_ITEMS_TABLE = """
CREATE TABLE IF NOT EXISTS action_items (
    item_id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
    meeting_id INTEGER REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    due_date DATE,
    status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    segment_id INTEGER REFERENCES speaker_segments(segment_id), -- to link back to the exact moment
    CONSTRAINT fk_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id),
    CONSTRAINT fk_segment FOREIGN KEY (segment_id) REFERENCES speaker_segments(segment_id),
    CONSTRAINT fk_user FOREIGN KEY (firebase_uid) REFERENCES users(firebase_uid)
);
"""

CREATE_DECISIONS_TABLE = """
CREATE TABLE IF NOT EXISTS decisions (
    decision_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    segment_id INTEGER REFERENCES speaker_segments(segment_id), -- to link back to the exact moment
    CONSTRAINT fk_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id),
    CONSTRAINT fk_segment FOREIGN KEY (segment_id) REFERENCES speaker_segments(segment_id)
);
"""

CREATE_SPEAKER_STATISTICS_TABLE = """
CREATE TABLE IF NOT EXISTS speaker_statistics (
    stat_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    speaker_label VARCHAR(50) NOT NULL,
    total_speaking_time DECIMAL(10, 3) NOT NULL, -- in seconds
    speaking_percentage DECIMAL(5, 2),           -- percentage of total meeting
    interruption_count INTEGER DEFAULT 0,
    CONSTRAINT fk_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id)
);
"""
CREATE_FEEDBACK_TABLE = """
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
    feedback_text TEXT NOT NULL,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('general feedback', 'bug report', 'feature request', 'question')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (firebase_uid) REFERENCES users(firebase_uid)
);
"""

def init_db():
    """
    Initialize the database by creating all required tables.
    """
    try:
        # Test database connection first
        if not test_connection():
            logger.error("Database connection test failed, aborting table creation")
            return False

        # Create tables using new connection pool
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Create tables
                cursor.execute(CREATE_USERS_TABLE)
                cursor.execute(CREATE_MEETINGS_TABLE)
                cursor.execute(CREATE_SPEAKER_SEGMENTS_TABLE)
                cursor.execute(CREATE_SPEAKERS_TABLE)
                cursor.execute(CREATE_MEETING_SUMMARIES_TABLE)
                cursor.execute(CREATE_NOTES_TABLE)
                cursor.execute(CREATE_ACTION_ITEMS_TABLE)
                cursor.execute(CREATE_DECISIONS_TABLE)
                cursor.execute(CREATE_SPEAKER_STATISTICS_TABLE)
                cursor.execute(CREATE_FEEDBACK_TABLE)

                # Commit the transaction
            conn.commit()
        logger.info("All database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        return False

# Initialize tables when this module is imported
if __name__ == "__main__":
    init_db()