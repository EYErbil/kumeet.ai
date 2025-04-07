from db import conn
import psycopg2
from utils.logger import setup_logger

# Set up logger
logger = setup_logger(__name__)

class FeedbackService:
    @staticmethod
    def create_feedback(firebase_uid, feedback_text, feedback_type):
        """Create a new feedback entry in the database."""
        try:
            logger.info(f"Creating feedback for user {firebase_uid}")
            with conn.cursor() as cur:
                query = """
                INSERT INTO feedback (firebase_uid, feedback_text, feedback_type)
                VALUES (%s, %s, %s)
                RETURNING feedback_id;
                """
                cur.execute(query, (firebase_uid, feedback_text, feedback_type))
                feedback_id = cur.fetchone()[0]
                conn.commit()
                logger.info(f"Successfully created feedback with ID: {feedback_id}")
                return feedback_id
        except psycopg2.Error as e:
            logger.error(f"Database error while creating feedback: {str(e)}", exc_info=True)
            conn.rollback()
            raise
        except Exception as e:
            logger.error(f"Unexpected error while creating feedback: {str(e)}", exc_info=True)
            raise 