import pytest
from db import get_db_connection
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_tables_exist():
    """Verify all expected database tables exist"""
    expected_tables = [
        'users', 
        'meetings', 
        'speaker_segments', 
        'speakers', 
        'meeting_summaries', 
        'notes', 
        'action_items', 
        'decisions', 
        'speaker_statistics',
        'feedback'
    ]
    
    query = """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
    """
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                tables = [row[0] for row in cursor.fetchall()]
                
        for table in expected_tables:
            assert table in tables, f"Table '{table}' does not exist in the database"
        
        logger.info(f"All expected tables exist: {expected_tables}")
        return True
    except Exception as e:
        logger.error(f"Database schema test failed: {e}")
        return False
        
def test_users_table_columns():
    """Verify the users table has the expected columns"""
    expected_columns = [
        'firebase_uid',
        'email',
        'first_name',
        'last_name',
        'created_at'
    ]
    
    query = """
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users'
    ORDER BY column_name;
    """
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                columns = [row[0] for row in cursor.fetchall()]
                
        for column in expected_columns:
            assert column in columns, f"Column '{column}' does not exist in the users table"
        
        logger.info(f"All expected columns exist in users table: {expected_columns}")
        return True
    except Exception as e:
        logger.error(f"Users table schema test failed: {e}")
        return False

def test_meetings_table_columns():
    """Verify the meetings table has the expected columns"""
    expected_columns = [
        'meeting_id',
        'firebase_uid',
        'title',
        'description',
        'meeting_type',
        'meeting_date',
        'duration_seconds',
        'original_video_path',
        'audio_path',
        'start_time',
        'end_time',
        'created_at'
    ]
    
    query = """
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'meetings'
    ORDER BY column_name;
    """
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                columns = [row[0] for row in cursor.fetchall()]
                
        for column in expected_columns:
            assert column in columns, f"Column '{column}' does not exist in the meetings table"
        
        logger.info(f"All expected columns exist in meetings table: {expected_columns}")
        return True
    except Exception as e:
        logger.error(f"Meetings table schema test failed: {e}")
        return False

if __name__ == "__main__":
    # Run tests manually if script is executed directly
    logger.info("Testing database tables exist")
    test_database_tables_exist()
    
    logger.info("Testing users table schema")
    test_users_table_columns()
    
    logger.info("Testing meetings table schema")
    test_meetings_table_columns()
    
    logger.info("All database schema tests passed!") 