from db import get_db_connection, transaction
from utils.logger import setup_logger

# Set up logger
logger = setup_logger(__name__)

class UserService:
    @staticmethod
    def create_user(firebase_uid, email, first_name=None, last_name=None):
        """Create a new user in the database."""
        try:
            with transaction() as conn:
                with conn.cursor() as cur:
                    query = """
                    INSERT INTO users (firebase_uid, email, first_name, last_name)
                    VALUES (%s, %s, %s, %s)
                    RETURNING firebase_uid;
                    """
                    cur.execute(query, (firebase_uid, email, first_name, last_name))
                    user_id = cur.fetchone()[0]
                    return user_id
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise

    @staticmethod
    def get_user_by_firebase_uid(firebase_uid):
        """Get user details by Firebase UID."""
        try:
            logger.info(f"Attempting to fetch user with Firebase UID: {firebase_uid}")
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    query = """
                    SELECT firebase_uid, email, COALESCE(first_name, ''), COALESCE(last_name, ''), created_at
                    FROM users
                    WHERE firebase_uid = %s;
                    """
                    logger.debug(f"Executing query: {query} with params: {firebase_uid}")
                    cur.execute(query, (firebase_uid,))
                    result = cur.fetchone()
                    
                    if result:
                        user_data = {
                            'firebase_uid': result[0],
                            'email': result[1],
                            'first_name': result[2],
                            'last_name': result[3],
                            'created_at': result[4]
                        }
                        logger.info(f"Successfully retrieved user data: {user_data}")
                        return user_data
                    else:
                        logger.warning(f"No user found with Firebase UID: {firebase_uid}")
                        return None
        except Exception as e:
            logger.error(f"Unexpected error while getting user: {str(e)}", exc_info=True)
            raise

    @staticmethod
    def update_user_profile(firebase_uid, first_name=None, last_name=None):
        """Update user's profile information."""
        try:
            with transaction() as conn:
                with conn.cursor() as cur:
                    updates = []
                    params = []
                    
                    if first_name is not None:
                        updates.append("first_name = %s")
                        params.append(first_name)

                    if last_name is not None:
                        updates.append("last_name = %s")
                        params.append(last_name)
                    
                    if not updates:
                        # If no updates, just return the current user data
                        return UserService.get_user_by_firebase_uid(firebase_uid)
                    
                    query = f"""
                    UPDATE users
                    SET {", ".join(updates)}
                    WHERE firebase_uid = %s;
                    """
                    params.append(firebase_uid)
                    
                    cur.execute(query, params)
                    
                    # Return the updated user data
                    return UserService.get_user_by_firebase_uid(firebase_uid)
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            raise

    @staticmethod
    def user_exists(firebase_uid):
        """Check if a user exists in the database."""
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    query = """
                    SELECT EXISTS(
                        SELECT 1 FROM users 
                        WHERE firebase_uid = %s
                    );
                    """
                    cur.execute(query, (firebase_uid,))
                    return cur.fetchone()[0]
        except Exception as e:
            logger.error(f"Error checking user existence: {e}")
            raise

    @staticmethod
    def delete_user(firebase_uid):
        """Delete a user and all their related data from the database, except feedback."""
        try:
            with transaction() as conn:
                with conn.cursor() as cur:
                    # First, delete action items associated with the user
                    logger.info(f"Deleting action items for user: {firebase_uid}")
                    cur.execute("""
                        DELETE FROM action_items 
                        WHERE firebase_uid = %s;
                    """, (firebase_uid,))
                    
                    # Delete notes associated with the user
                    logger.info(f"Deleting notes for user: {firebase_uid}")
                    cur.execute("""
                        DELETE FROM notes 
                        WHERE firebase_uid = %s;
                    """, (firebase_uid,))
                    
                    # Get all meetings for this user
                    logger.info(f"Fetching meetings for user: {firebase_uid}")
                    cur.execute("""
                        SELECT meeting_id FROM meetings 
                        WHERE firebase_uid = %s;
                    """, (firebase_uid,))
                    meeting_ids = [row[0] for row in cur.fetchall()]
                    
                    # For each meeting, delete related data
                    for meeting_id in meeting_ids:
                        logger.info(f"Deleting data for meeting: {meeting_id}")
                        
                        # Delete speaker statistics
                        cur.execute("""
                            DELETE FROM speaker_statistics 
                            WHERE meeting_id = %s;
                        """, (meeting_id,))
                        
                        # Delete decisions
                        cur.execute("""
                            DELETE FROM decisions 
                            WHERE meeting_id = %s;
                        """, (meeting_id,))
                        
                        # Delete speakers
                        cur.execute("""
                            DELETE FROM speakers 
                            WHERE meeting_id = %s;
                        """, (meeting_id,))
                        
                        # Delete meeting summaries
                        cur.execute("""
                            DELETE FROM meeting_summaries 
                            WHERE meeting_id = %s;
                        """, (meeting_id,))
                        
                        # Delete speaker segments
                        cur.execute("""
                            DELETE FROM speaker_segments 
                            WHERE meeting_id = %s;
                        """, (meeting_id,))
                        
                        # Finally, delete the meeting itself
                        cur.execute("""
                            DELETE FROM meetings 
                            WHERE meeting_id = %s;
                        """, (meeting_id,))
                    
                    # Delete the user record
                    logger.info(f"Deleting user: {firebase_uid}")
                    cur.execute("""
                        DELETE FROM users 
                        WHERE firebase_uid = %s;
                    """, (firebase_uid,))
                    
                    logger.info(f"Successfully deleted user and all related data: {firebase_uid}")
                    return True
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            raise 