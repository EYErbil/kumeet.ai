import psycopg2
from db import get_db_connection
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_dev_user():
    """Create a development user for testing."""
    try:
        dev_user_id = "dev-admin-at-example.com"
        
        # Check if user already exists
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT firebase_uid FROM users WHERE firebase_uid = %s", (dev_user_id,))
                existing_user = cur.fetchone()
                
                if existing_user:
                    logger.info(f"Development user '{dev_user_id}' already exists")
                    return True
                
                # Create development user
                cur.execute("""
                    INSERT INTO users (firebase_uid, email, first_name, last_name)
                    VALUES (%s, %s, %s, %s)
                """, (dev_user_id, "admin@example.com", "Dev", "Admin"))
                
                conn.commit()
                logger.info(f"Created development user: {dev_user_id}")
                return True
                
    except Exception as e:
        logger.error(f"Failed to create development user: {e}")
        return False

if __name__ == "__main__":
    create_dev_user() 