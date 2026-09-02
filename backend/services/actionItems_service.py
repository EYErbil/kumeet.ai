from db import get_db_connection, execute_query
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import logging

# Set up logger
logger = logging.getLogger(__name__)


class ActionItemsService:
    @staticmethod
    def _format_action_item(item, meeting_title=None):
        """
        Format a database action item for frontend use
        
        Args:
            item (dict): Database action item row
            meeting_title (str, optional): Meeting title if not included in item
            
        Returns:
            dict: Formatted action item for frontend
        """
        try:
            # Check if item is a dict
            if not isinstance(item, dict):
                return None
                
            # Make sure item has the required keys
            if 'item_id' not in item:
                return None

            # Safely get meeting name
            try:
                meeting_name = meeting_title or item.get('meeting_title') or 'General'
            except Exception as e:
                meeting_name = 'General'  # Fallback
            
            # Safely construct the formatted item
            formatted_item = {
                'id': str(item['item_id']),
                'description': item.get('description', '') or '',
                'meeting': meeting_name,
                'meeting_id': str(item.get('meeting_id', '')) if item.get('meeting_id') else '',
                'meeting_title': meeting_name,
                'status': item.get('status', 'pending') or 'pending',
            }
            
            # Handle due_date carefully
            due_date = item.get('due_date')
            
            if due_date and hasattr(due_date, 'strftime'):
                formatted_item['due_date'] = due_date.strftime('%Y-%m-%d')
            else:
                formatted_item['due_date'] = 'No due date'
            
            return formatted_item
        except Exception as e:
            # Safely log error without assuming item is a dict
            item_id = "unknown"
            if isinstance(item, dict) and 'item_id' in item:
                item_id = item['item_id']
            return None
    
    @staticmethod
    def _get_meeting_title(meeting_id):
        """
        Get the title of a meeting
        
        Args:
            meeting_id (int): The ID of the meeting
            
        Returns:
            str: The meeting title, or None if not found
        """
        try:
            query = "SELECT title FROM meetings WHERE meeting_id = %s"
            results = execute_query(query, (meeting_id,))
            
            if not results or len(results) == 0:
                return None
                
            return results[0][0]
        except Exception as e:
            logger.error(f"Error getting meeting title: {e}")
            return None
    
    @staticmethod
    def _count_action_items(user_id=None):
        """
        Count action items in the database
        
        Args:
            user_id (str, optional): User ID to filter by
            
        Returns:
            int: Number of action items, or 0 on error
        """
        try:
            if user_id:
                query = "SELECT COUNT(*) FROM action_items WHERE firebase_uid = %s"
                results = execute_query(query, (user_id,))
            else:
                query = "SELECT COUNT(*) FROM action_items"
                results = execute_query(query)
                
            return results[0][0] if results else 0
        except Exception as e:
            logger.error(f"Error counting action items: {e}")
            return 0

    @staticmethod
    def count_pending_action_items(user_id):
        """
        Count pending action items for a specific user
        
        Args:
            user_id (str): Firebase UID of the user to count pending action items for
            
        Returns:
            int: Number of pending action items, or 0 on error
        """
        try:
            if not user_id:
                logger.error("Cannot count pending action items: user_id is required")
                return 0
                
            query = "SELECT COUNT(*) FROM action_items WHERE firebase_uid = %s AND status = 'pending'"
            results = execute_query(query, (user_id,))
                
            return results[0][0] if results else 0
        except Exception as e:
            logger.error(f"Error counting pending action items: {e}")
            return 0

    @staticmethod
    def get_all_action_items(user_id, limit=50):
        """
        Get action items for a specific user

        Args:
            user_id (str): Firebase UID of the user to get action items for
            limit (int): Maximum number of action items to return

        Returns:
            list: List of action item objects for the user
        """
        try:
            # Log the request
            logger.info(f"Fetching action items for user: {user_id}, limit: {limit}")
            
            if not user_id:
                logger.error("Cannot fetch action items: user_id is required")
                return []
            
            # Base query with joins
            query = """
            SELECT 
                ai.item_id, ai.description, ai.due_date, ai.status,
                ai.meeting_id, ai.segment_id,
                m.title as meeting_title
            FROM action_items ai
            LEFT JOIN meetings m ON ai.meeting_id = m.meeting_id
            WHERE ai.firebase_uid = %s
            ORDER BY ai.due_date ASC NULLS LAST
            LIMIT %s
            """
            
            # Execute the query
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(query, (user_id, limit))
                    items_data = cur.fetchall()
            
            logger.info(f"Found {len(items_data)} action items for user {user_id}")
            
            # Transform to frontend format
            action_items = []
            for item in items_data:
                formatted_item = ActionItemsService._format_action_item(item)
                if formatted_item:
                    action_items.append(formatted_item)
            
            return action_items
        except Exception as e:
            logger.error(f"Error in get_all_action_items: {e}")
            raise

    @staticmethod
    def get_action_items_for_meeting(meeting_id, limit=50):
        """
        Get action items for a specific meeting

        Args:
            meeting_id (int): Meeting ID to filter by
            limit (int): Maximum number of action items to return

        Returns:
            list: List of action item objects
        """
        try:
            # Log the request
            logger.info(f"Fetching action items for meeting ID: {meeting_id}")
            
            # First check if the meeting exists and get its title
            meeting_title = ActionItemsService._get_meeting_title(meeting_id)
            if not meeting_title:
                logger.warning(f"Meeting with ID {meeting_id} not found")
                return []
            
            # Get action items for this meeting
            query = """
            SELECT 
                ai.item_id, ai.description, ai.due_date, ai.status,
                ai.meeting_id, ai.segment_id
            FROM action_items ai
            WHERE ai.meeting_id = %s
            ORDER BY ai.due_date ASC NULLS LAST
            LIMIT %s
            """
            
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(query, (meeting_id, limit))
                    items_data = cur.fetchall()
            
            logger.info(f"Found {len(items_data)} action items for meeting {meeting_id}")
            
            # Transform to frontend format
            action_items = []
            for item in items_data:
                formatted_item = ActionItemsService._format_action_item(item, meeting_title)
                if formatted_item:
                    action_items.append(formatted_item)
            
            return action_items
        except Exception as e:
            logger.error(f"Error in get_action_items_for_meeting: {e}")
            raise
    
    @staticmethod
    def get_action_item_by_id(item_id):
        """
        Get action item by ID
        
        Args:
            item_id (int or str): ID of the action item
            
        Returns:
            dict: Action item details or None
        """
        try:
            if not item_id:
                return None
            
            # Convert item_id to int if it's a string
            try:
                item_id_int = int(item_id)
            except (ValueError, TypeError) as conversion_error:
                # Return a minimal item with at least an ID to avoid errors
                return {'id': str(item_id), 'description': 'Action Item', 'status': 'pending'}
                
            query = """
            SELECT 
                ai.item_id, ai.description, ai.due_date, ai.status,
                ai.meeting_id, ai.segment_id,
                m.title as meeting_title
            FROM action_items ai
            LEFT JOIN meetings m ON ai.meeting_id = m.meeting_id
            WHERE ai.item_id = %s
            """
            
            try:
                with get_db_connection() as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute(query, (item_id_int,))
                        item = cur.fetchone()
                
                if not item:
                    return None
                
            except Exception as db_error:
                # Return a minimal item with at least an ID to avoid errors
                return {'id': str(item_id), 'description': 'Action Item', 'status': 'pending'}
            
            # Format the action item
            formatted_item = ActionItemsService._format_action_item(item)
            
            if not formatted_item:
                # Return a minimal item with at least an ID to avoid errors
                return {'id': str(item_id), 'description': 'Action Item', 'status': 'pending'}
            
            return formatted_item
        except Exception as e:
            # Return a minimal item with at least an ID to avoid errors
            return {'id': str(item_id), 'description': 'Action Item', 'status': 'pending'}

    @staticmethod
    def create_action_item(item_data):
        """
        Create a new action item
        
        Args:
            item_data (dict): Action item data containing:
                - firebase_uid (str): UID of the user creating the action item
                - meeting_id (int, optional): ID of the related meeting
                - description (str): Description of the action item
                - due_date (str): Due date in YYYY-MM-DD format
                - status (str): 'completed' or 'pending'
                - segment_id (int, optional): ID of the related segment
            
        Returns:
            dict: Created action item details or None
        """
        try:
            # Validate the meeting ID if provided
            meeting_id = item_data.get('meeting_id')
            if meeting_id:
                meeting_title = ActionItemsService._get_meeting_title(meeting_id)
                if not meeting_title:
                    return None
                else:
                    logger.info(f"Meeting title found: {meeting_title}")        
            
            # Extract action item data
            firebase_uid = item_data.get('firebase_uid')
            if not firebase_uid:
                return None

            description = item_data.get('description')
            if not description:
                return None

            due_date = item_data.get('due_date')
            
            status = item_data.get('status', 'pending')
            
            segment_id = item_data.get('segment_id')
            
            # Insert the action item
            query = """
            INSERT INTO action_items (
                firebase_uid, meeting_id, description, due_date, status, segment_id
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING item_id
            """
            
            try:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute(query, (
                            firebase_uid, meeting_id, description, due_date, status, segment_id
                        ))
                        item_id = cur.fetchone()[0]
                        conn.commit()
                
            except Exception as db_error:
                raise
            
            result = ActionItemsService.get_action_item_by_id(item_id)
            return result
        except Exception as e:
            raise

    @staticmethod
    def update_action_item(item_id, item_data):
        """
        Update an existing action item
        
        Args:
            item_id (int or str): ID of the action item to update
            item_data (dict): Updated action item data
            
        Returns:
            dict: Updated action item details or None
        """
        try:
            # Convert item_id to int if it's a string
            try:
                item_id_int = int(item_id)
            except (ValueError, TypeError):
                logger.error(f"Invalid action item ID: {item_id}, cannot convert to integer")
                return None
                
            # First check if the action item exists
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT item_id FROM action_items WHERE item_id = %s", (item_id_int,))
                    if not cur.fetchone():
                        logger.error(f"Cannot update: Action item ID {item_id} not found")
                        return None
            
            # Build update fields
            update_fields = []
            params = []
            
            for field in ['meeting_id', 'description', 'due_date', 'status', 'segment_id']:
                if field in item_data:
                    update_fields.append(f"{field} = %s")
                    params.append(item_data.get(field))
            
            if not update_fields:
                logger.warning(f"No fields to update for action item {item_id}")
                return ActionItemsService.get_action_item_by_id(item_id)
            
            # Add the item_id parameter
            params.append(item_id_int)
            
            # Execute the update
            query = f"""
            UPDATE action_items
            SET {', '.join(update_fields)}
            WHERE item_id = %s
            """
            
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, params)
                    conn.commit()
            
            logger.info(f"Updated action item with ID: {item_id}")
            
            # Return the updated action item
            return ActionItemsService.get_action_item_by_id(item_id)
        except Exception as e:
            logger.error(f"Error updating action item: {e}")
            raise

    @staticmethod
    def delete_action_item(item_id):
        """
        Delete an action item
        
        Args:
            item_id (int or str): ID of the action item to delete
            
        Returns:
            bool: True if deleted, False otherwise
        """
        try:
            # Convert item_id to int if it's a string
            try:
                item_id_int = int(item_id)
            except (ValueError, TypeError):
                logger.error(f"Invalid action item ID: {item_id}, cannot convert to integer")
                return False
                
            # First check if the action item exists
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT item_id FROM action_items WHERE item_id = %s", (item_id_int,))
                    if not cur.fetchone():
                        logger.error(f"Cannot delete: Action item ID {item_id} not found")
                        return False
            
            # Delete the action item
            query = "DELETE FROM action_items WHERE item_id = %s"
            
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (item_id_int,))
                    conn.commit()
            
            logger.info(f"Deleted action item with ID: {item_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting action item: {e}")
            raise