from db import conn
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import logging

# Set up logger
logger = logging.getLogger(__name__)


class ActionItemsService:
    @staticmethod
    def get_all_action_items(user_id=None, limit=50):
        """
        Get action items with optional filters

        Args:
            user_id (str): Optional firebase UID to filter action items by user
            limit (int): Maximum number of action items to return

        Returns:
            list: List of action item objects
        """
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Debugging log
                logger.info(f"Fetching all action items. User ID filter: {user_id}, limit: {limit}")

                # First, check if the action_items table has any records
                cur.execute("SELECT COUNT(*) FROM action_items")
                total_items = cur.fetchone()['count']
                logger.info(f"Total action items in database: {total_items}")

                # Base query - join with meetings and users for additional info
                query = """
                SELECT 
                    ai.item_id, ai.description, ai.due_date, ai.status, ai.firebase_uid,
                    ai.meeting_id, ai.segment_id,
                    u.first_name, u.last_name, u.email,
                    m.title as meeting_title
                FROM action_items ai
                LEFT JOIN users u ON ai.firebase_uid = u.firebase_uid
                LEFT JOIN meetings m ON ai.meeting_id = m.meeting_id
                """

                params = []

                # Add user filter if provided
                if user_id:
                    query += " WHERE ai.firebase_uid = %s"
                    params.append(user_id)

                    # Debug log for user filter
                    cur.execute("SELECT COUNT(*) FROM action_items WHERE firebase_uid = %s", (user_id,))
                    user_items = cur.fetchone()['count']
                    logger.info(f"Action items found for user {user_id}: {user_items}")

                # Add ordering and limit
                query += " ORDER BY ai.due_date ASC NULLS LAST LIMIT %s"
                params.append(limit)

                # Log the query for debugging
                logger.info(f"Executing query: {query} with params: {params}")

                cur.execute(query, params)
                items_data = cur.fetchall()
                logger.info(f"Found {len(items_data)} action items")

                # If no items found with user filter but there are items in the DB,
                # it might be an authentication issue. Return all items as fallback.
                if len(items_data) == 0 and total_items > 0 and user_id:
                    logger.warning(
                        f"No action items found for user {user_id}, but DB has {total_items} items. Returning all items.")
                    cur.execute("""
                        SELECT 
                            ai.item_id, ai.description, ai.due_date, ai.status, ai.firebase_uid,
                            ai.meeting_id, ai.segment_id,
                            u.first_name, u.last_name, u.email,
                            m.title as meeting_title
                        FROM action_items ai
                        LEFT JOIN users u ON ai.firebase_uid = u.firebase_uid
                        LEFT JOIN meetings m ON ai.meeting_id = m.meeting_id
                        ORDER BY ai.due_date ASC NULLS LAST
                        LIMIT %s
                    """, (limit,))
                    items_data = cur.fetchall()
                    logger.info(f"Found {len(items_data)} action items after removing user filter")

                # Transform to frontend format
                action_items = []
                for item in items_data:
                    try:
                        # Format for frontend
                        action_item = {
                            'id': str(item['item_id']),
                            'text': item['description'] or '',
                            'meeting': item['meeting_title'] or 'General',
                            'meetingId': str(item['meeting_id']) if item['meeting_id'] else '',
                            'completed': item['status'] == 'completed',
                            'dueDate': item['due_date'].strftime('%Y-%m-%d') if item['due_date'] else 'No due date',
                            'assignee': {
                                'id': item['firebase_uid'] or '',
                                'name': f"{item['first_name'] or ''} {item['last_name'] or ''}".strip() or 'Unassigned',
                                'email': item['email'] or ''
                            }
                        }
                        action_items.append(action_item)
                    except Exception as e:
                        logger.error(f"Error transforming action item {item.get('item_id')}: {e}")
                        # Continue with next item

                return action_items

        except psycopg2.Error as e:
            logger.error(f"Database error in get_all_action_items: {e}")
            return []
        except Exception as e:
            logger.error(f"Error in get_all_action_items: {e}")
            return []

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
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Debugging log
                logger.info(f"Fetching action items for meeting ID: {meeting_id}")

                # First check if the meeting exists
                cur.execute("SELECT title FROM meetings WHERE meeting_id = %s", (meeting_id,))
                meeting = cur.fetchone()
                if not meeting:
                    logger.warning(f"Meeting with ID {meeting_id} not found")
                    return []

                meeting_title = meeting['title']

                # Get action items for this meeting
                query = """
                SELECT 
                    ai.item_id, ai.description, ai.due_date, ai.status, ai.firebase_uid,
                    ai.segment_id,
                    u.first_name, u.last_name, u.email
                FROM action_items ai
                LEFT JOIN users u ON ai.firebase_uid = u.firebase_uid
                WHERE ai.meeting_id = %s
                ORDER BY ai.due_date ASC NULLS LAST
                LIMIT %s
                """

                cur.execute(query, (meeting_id, limit))
                items_data = cur.fetchall()
                logger.info(f"Found {len(items_data)} action items for meeting {meeting_id}")

                # Transform to frontend format
                action_items = []
                for item in items_data:
                    try:
                        # Format for frontend
                        action_item = {
                            'id': str(item['item_id']),
                            'text': item['description'] or '',
                            'meeting': meeting_title,
                            'meetingId': str(meeting_id),
                            'completed': item['status'] == 'completed',
                            'dueDate': item['due_date'].strftime('%Y-%m-%d') if item['due_date'] else 'No due date',
                            'assignee': {
                                'id': item['firebase_uid'] or '',
                                'name': f"{item['first_name'] or ''} {item['last_name'] or ''}".strip() or 'Unassigned',
                                'email': item['email'] or ''
                            }
                        }
                        action_items.append(action_item)
                    except Exception as e:
                        logger.error(f"Error transforming action item {item.get('item_id')}: {e}")
                        # Continue with next item

                return action_items

        except psycopg2.Error as e:
            logger.error(f"Database error in get_action_items_for_meeting: {e}")
            return []
        except Exception as e:
            logger.error(f"Error in get_action_items_for_meeting: {e}")
            return []

    @staticmethod
    def create_action_item(item_data):
        """
        Create a new action item

        Args:
            item_data (dict): Action item data

        Returns:
            dict: Created action item object
        """
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Extract data with safe defaults
                firebase_uid = item_data.get('firebase_uid')
                if not firebase_uid:
                    logger.error("Missing required field: firebase_uid")
                    raise ValueError("Missing required field: firebase_uid")

                meeting_id = item_data.get('meeting_id')
                # Convert to int if it's a string
                if meeting_id and isinstance(meeting_id, str):
                    try:
                        meeting_id = int(meeting_id)
                    except ValueError:
                        meeting_id = None

                description = item_data.get('description') or item_data.get('text')
                if not description:
                    logger.error("Missing required field: description or text")
                    raise ValueError("Missing required field: description or text")

                # Parse due date
                due_date = item_data.get('due_date')
                if due_date and isinstance(due_date, str):
                    try:
                        # Try to parse as ISO format
                        due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                    except ValueError:
                        try:
                            # Try to parse as YYYY-MM-DD
                            due_date = datetime.strptime(due_date, '%Y-%m-%d')
                        except ValueError:
                            logger.warning(f"Could not parse due date: {due_date}")
                            due_date = None

                # Default status is pending
                status = item_data.get('status', 'pending')
                if item_data.get('completed') is not None:
                    status = 'completed' if item_data.get('completed') else 'pending'

                # Segment ID is optional
                segment_id = item_data.get('segment_id')

                # Insert action item
                query = """
                INSERT INTO action_items (firebase_uid, meeting_id, description, due_date, status, segment_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING item_id
                """

                cur.execute(query, (firebase_uid, meeting_id, description, due_date, status, segment_id))
                result = cur.fetchone()

                # Get meeting title if applicable
                meeting_title = 'General'
                if meeting_id:
                    try:
                        cur.execute("SELECT title FROM meetings WHERE meeting_id = %s", (meeting_id,))
                        meeting_info = cur.fetchone()
                        if meeting_info:
                            meeting_title = meeting_info['title']
                    except Exception as e:
                        logger.error(f"Error fetching meeting title: {e}")

                # Get user info
                user_name = 'User'
                user_email = ''
                try:
                    cur.execute("SELECT first_name, last_name, email FROM users WHERE firebase_uid = %s",
                                (firebase_uid,))
                    user_info = cur.fetchone()
                    if user_info:
                        user_name = f"{user_info['first_name'] or ''} {user_info['last_name'] or ''}".strip() or 'User'
                        user_email = user_info['email'] or ''
                except Exception as e:
                    logger.error(f"Error fetching user info: {e}")

                conn.commit()

                # Format created action item for response
                created_item = {
                    'id': str(result['item_id']),
                    'text': description,
                    'meeting': meeting_title,
                    'meetingId': str(meeting_id) if meeting_id else '',
                    'completed': status == 'completed',
                    'dueDate': due_date.strftime('%Y-%m-%d') if due_date else 'No due date',
                    'assignee': {
                        'id': firebase_uid,
                        'name': user_name,
                        'email': user_email
                    }
                }

                return created_item

        except psycopg2.Error as e:
            conn.rollback()
            logger.error(f"Database error in create_action_item: {e}")
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"Error in create_action_item: {e}")
            raise

    @staticmethod
    def update_action_item(item_id, item_data):
        """
        Update an existing action item

        Args:
            item_id (int): ID of the action item to update
            item_data (dict): Updated action item data

        Returns:
            dict: Updated action item object
        """
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # First check if action item exists
                cur.execute("""
                    SELECT 
                        ai.item_id, ai.description, ai.due_date, ai.status, ai.firebase_uid,
                        ai.meeting_id, ai.segment_id,
                        u.first_name, u.last_name, u.email,
                        m.title as meeting_title
                    FROM action_items ai
                    LEFT JOIN users u ON ai.firebase_uid = u.firebase_uid
                    LEFT JOIN meetings m ON ai.meeting_id = m.meeting_id
                    WHERE ai.item_id = %s
                """, (item_id,))

                existing_item = cur.fetchone()
                if not existing_item:
                    logger.error(f"Action item with ID {item_id} not found")
                    raise ValueError(f"Action item with ID {item_id} not found")

                # Build update query
                update_fields = []
                params = []

                # Description
                if 'description' in item_data or 'text' in item_data:
                    description = item_data.get('description') or item_data.get('text')
                    update_fields.append("description = %s")
                    params.append(description)

                # Due date
                if 'due_date' in item_data:
                    due_date = item_data['due_date']
                    if due_date and isinstance(due_date, str):
                        try:
                            # Try to parse as ISO format
                            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                        except ValueError:
                            try:
                                # Try to parse as YYYY-MM-DD
                                due_date = datetime.strptime(due_date, '%Y-%m-%d')
                            except ValueError:
                                logger.warning(f"Could not parse due date: {due_date}")
                                due_date = None

                    update_fields.append("due_date = %s")
                    params.append(due_date)

                # Status
                if 'status' in item_data or 'completed' in item_data:
                    if 'completed' in item_data:
                        # Convert boolean to status string
                        status = 'completed' if item_data['completed'] else 'pending'
                    else:
                        status = item_data['status']

                    update_fields.append("status = %s")
                    params.append(status)

                # Meeting ID
                if 'meeting_id' in item_data or 'meetingId' in item_data:
                    meeting_id = item_data.get('meeting_id') or item_data.get('meetingId')
                    if meeting_id and isinstance(meeting_id, str):
                        try:
                            meeting_id = int(meeting_id)
                        except ValueError:
                            meeting_id = None

                    update_fields.append("meeting_id = %s")
                    params.append(meeting_id)

                # Firebase UID (assignee)
                if 'firebase_uid' in item_data or 'assignee' in item_data:
                    if 'assignee' in item_data and isinstance(item_data['assignee'], dict):
                        firebase_uid = item_data['assignee'].get('id')
                    else:
                        firebase_uid = item_data.get('firebase_uid')

                    if firebase_uid:
                        update_fields.append("firebase_uid = %s")
                        params.append(firebase_uid)

                # If nothing to update, return existing item
                if not update_fields:
                    logger.info(f"No fields to update for action item {item_id}")

                    # Format existing item for return
                    return {
                        'id': str(existing_item['item_id']),
                        'text': existing_item['description'] or '',
                        'meeting': existing_item['meeting_title'] or 'General',
                        'meetingId': str(existing_item['meeting_id']) if existing_item['meeting_id'] else '',
                        'completed': existing_item['status'] == 'completed',
                        'dueDate': existing_item['due_date'].strftime('%Y-%m-%d') if existing_item[
                            'due_date'] else 'No due date',
                        'assignee': {
                            'id': existing_item['firebase_uid'] or '',
                            'name': f"{existing_item['first_name'] or ''} {existing_item['last_name'] or ''}".strip() or 'Unassigned',
                            'email': existing_item['email'] or ''
                        }
                    }

                # Add item_id to params
                params.append(item_id)

                # Execute update
                query = f"""
                UPDATE action_items
                SET {", ".join(update_fields)}
                WHERE item_id = %s
                RETURNING item_id
                """

                cur.execute(query, params)
                result = cur.fetchone()

                if not result:
                    logger.error(f"Failed to update action item with ID {item_id}")
                    raise ValueError(f"Failed to update action item with ID {item_id}")

                # Get updated item with joins
                cur.execute("""
                    SELECT 
                        ai.item_id, ai.description, ai.due_date, ai.status, ai.firebase_uid,
                        ai.meeting_id, ai.segment_id,
                        u.first_name, u.last_name, u.email,
                        m.title as meeting_title
                    FROM action_items ai
                    LEFT JOIN users u ON ai.firebase_uid = u.firebase_uid
                    LEFT JOIN meetings m ON ai.meeting_id = m.meeting_id
                    WHERE ai.item_id = %s
                """, (item_id,))

                updated_item = cur.fetchone()

                conn.commit()

                # Format updated item for return
                return {
                    'id': str(updated_item['item_id']),
                    'text': updated_item['description'] or '',
                    'meeting': updated_item['meeting_title'] or 'General',
                    'meetingId': str(updated_item['meeting_id']) if updated_item['meeting_id'] else '',
                    'completed': updated_item['status'] == 'completed',
                    'dueDate': updated_item['due_date'].strftime('%Y-%m-%d') if updated_item[
                        'due_date'] else 'No due date',
                    'assignee': {
                        'id': updated_item['firebase_uid'] or '',
                        'name': f"{updated_item['first_name'] or ''} {updated_item['last_name'] or ''}".strip() or 'Unassigned',
                        'email': updated_item['email'] or ''
                    }
                }

        except psycopg2.Error as e:
            conn.rollback()
            logger.error(f"Database error in update_action_item: {e}")
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"Error in update_action_item: {e}")
            raise

    @staticmethod
    def delete_action_item(item_id):
        """
        Delete an action item

        Args:
            item_id (int): ID of the action item to delete

        Returns:
            bool: True if successful
        """
        try:
            with conn.cursor() as cur:
                query = "DELETE FROM action_items WHERE item_id = %s"
                cur.execute(query, (item_id,))

                if cur.rowcount == 0:
                    logger.error(f"Action item with ID {item_id} not found")
                    raise ValueError(f"Action item with ID {item_id} not found")

                conn.commit()
                return True

        except psycopg2.Error as e:
            conn.rollback()
            logger.error(f"Database error in delete_action_item: {e}")
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"Error in delete_action_item: {e}")
            raise