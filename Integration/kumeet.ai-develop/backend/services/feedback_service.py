from db import get_db_connection, transaction
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

# Set up logger
logger = logging.getLogger(__name__)

class FeedbackService:
    @staticmethod
    def submit_feedback(feedback_data):
        """Submit user feedback"""
        try:
            with transaction() as conn:
                with conn.cursor() as cur:
                    query = """
                    INSERT INTO feedback (
                        firebase_uid, feedback_type, feedback_text, 
                        rating, page, browser, device, 
                        os, screen_size, app_version
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING feedback_id
                    """
                    
                    # Extract data from the request
                    firebase_uid = feedback_data.get('firebase_uid')
                    feedback_type = feedback_data.get('feedback_type', 'general')
                    feedback_text = feedback_data.get('feedback_text', '')
                    rating = feedback_data.get('rating')
                    page = feedback_data.get('page', '')
                    browser = feedback_data.get('browser', '')
                    device = feedback_data.get('device', '')
                    os = feedback_data.get('os', '')
                    screen_size = feedback_data.get('screen_size', '')
                    app_version = feedback_data.get('app_version', '')
                    
                    cur.execute(
                        query, 
                        (
                            firebase_uid, feedback_type, feedback_text, 
                            rating, page, browser, device, 
                            os, screen_size, app_version
                        )
                    )
                    
                    feedback_id = cur.fetchone()[0]
                    
                    return {
                        "feedback_id": feedback_id,
                        "message": "Feedback submitted successfully. Thank you!"
                    }
                    
        except Exception as e:
            logger.error(f"Error submitting feedback: {str(e)}")
            raise

    @staticmethod
    def get_all_feedback(limit=50, offset=0):
        """Get all feedback submissions"""
        try:
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    query = """
                    SELECT f.*, u.email, u.first_name, u.last_name
                    FROM feedback f
                    LEFT JOIN users u ON f.firebase_uid = u.firebase_uid
                    ORDER BY f.created_at DESC
                    LIMIT %s OFFSET %s
                    """
                    
                    cur.execute(query, (limit, offset))
                    feedback_items = cur.fetchall()
                    
                    # Convert to list of dictionaries
                    result = []
                    for item in feedback_items:
                        # Format user info
                        user_info = None
                        if item['firebase_uid']:
                            user_info = {
                                'firebase_uid': item['firebase_uid'],
                                'email': item['email'],
                                'name': f"{item['first_name'] or ''} {item['last_name'] or ''}".strip() or None
                            }
                        
                        # Format the feedback item
                        formatted_item = {
                            'feedback_id': item['feedback_id'],
                            'feedback_type': item['feedback_type'],
                            'feedback_text': item['feedback_text'],
                            'rating': item['rating'],
                            'page': item['page'],
                            'browser': item['browser'],
                            'device': item['device'],
                            'os': item['os'],
                            'screen_size': item['screen_size'],
                            'app_version': item['app_version'],
                            'created_at': item['created_at'].isoformat() if item['created_at'] else None,
                            'user': user_info
                        }
                        
                        result.append(formatted_item)
                    
                    return result
                    
        except Exception as e:
            logger.error(f"Error getting feedback: {str(e)}")
            return []

    @staticmethod
    def get_feedback_by_id(feedback_id):
        """Get a specific feedback submission"""
        try:
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    query = """
                    SELECT f.*, u.email, u.first_name, u.last_name
                    FROM feedback f
                    LEFT JOIN users u ON f.firebase_uid = u.firebase_uid
                    WHERE f.feedback_id = %s
                    """
                    
                    cur.execute(query, (feedback_id,))
                    item = cur.fetchone()
                    
                    if not item:
                        return None
                    
                    # Format user info
                    user_info = None
                    if item['firebase_uid']:
                        user_info = {
                            'firebase_uid': item['firebase_uid'],
                            'email': item['email'],
                            'name': f"{item['first_name'] or ''} {item['last_name'] or ''}".strip() or None
                        }
                    
                    # Format the feedback item
                    return {
                        'feedback_id': item['feedback_id'],
                        'feedback_type': item['feedback_type'],
                        'feedback_text': item['feedback_text'],
                        'rating': item['rating'],
                        'page': item['page'],
                        'browser': item['browser'],
                        'device': item['device'],
                        'os': item['os'],
                        'screen_size': item['screen_size'],
                        'app_version': item['app_version'],
                        'created_at': item['created_at'].isoformat() if item['created_at'] else None,
                        'user': user_info
                    }
                    
        except Exception as e:
            logger.error(f"Error getting feedback: {str(e)}")
            return None 