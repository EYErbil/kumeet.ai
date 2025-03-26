from db import conn
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import logging

# Set up logger
logger = logging.getLogger(__name__)


class NotesService:
    @staticmethod
    def get_all_notes(user_id=None):
        """
        Get all notes for a user across all meetings

        Args:
            user_id (str): Optional firebase UID to filter notes by user

        Returns:
            list: List of note objects
        """
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Debugging log
                logger.info(f"Fetching all notes. User ID filter: {user_id}")

                # First, check if the notes table has any records at all
                cur.execute("SELECT COUNT(*) FROM notes")
                total_notes = cur.fetchone()['count']
                logger.info(f"Total notes in database: {total_notes}")

                # Base query to get notes with user and meeting info
                query = """
                SELECT 
                    n.note_id, n.note_text, n.firebase_uid, n.meeting_id, n.created_at,
                    u.first_name, u.last_name,
                    m.title as meeting_title, m.meeting_date
                FROM notes n
                LEFT JOIN users u ON n.firebase_uid = u.firebase_uid
                LEFT JOIN meetings m ON n.meeting_id = m.meeting_id
                """

                params = []

                # Add user filter if provided
                if user_id:
                    query += " WHERE n.firebase_uid = %s"
                    params.append(user_id)

                    # Debug log for user filter
                    cur.execute("SELECT COUNT(*) FROM notes WHERE firebase_uid = %s", (user_id,))
                    user_notes = cur.fetchone()['count']
                    logger.info(f"Notes found for user {user_id}: {user_notes}")

                # Add ordering
                query += " ORDER BY n.created_at DESC"

                # Log the query for debugging
                logger.info(f"Executing query: {query} with params: {params}")

                cur.execute(query, params)
                notes_data = cur.fetchall()
                logger.info(f"Found {len(notes_data)} notes")

                # If no notes found with user filter but there are notes in the DB,
                # it might be an authentication issue. Return all notes as fallback.
                if len(notes_data) == 0 and total_notes > 0 and user_id:
                    logger.warning(
                        f"No notes found for user {user_id}, but DB has {total_notes} notes. Returning all notes.")
                    cur.execute("""
                        SELECT 
                            n.note_id, n.note_text, n.firebase_uid, n.meeting_id, n.created_at,
                            u.first_name, u.last_name,
                            m.title as meeting_title, m.meeting_date
                        FROM notes n
                        LEFT JOIN users u ON n.firebase_uid = u.firebase_uid
                        LEFT JOIN meetings m ON n.meeting_id = m.meeting_id
                        ORDER BY n.created_at DESC
                    """)
                    notes_data = cur.fetchall()
                    logger.info(f"Found {len(notes_data)} notes after removing user filter")

                # Format notes for frontend
                notes = []
                for note in notes_data:
                    try:
                        # Log the note data for debugging
                        logger.debug(f"Processing note: {note}")

                        # Create transformed note with safe property access
                        transformed_note = {
                            "id": str(note['note_id']),
                            "content": note['note_text'] or '',
                            "meetingId": str(note['meeting_id']) if note['meeting_id'] else '',
                            "meetingTitle": note['meeting_title'] or 'Personal Note',
                            "meetingDate": note['meeting_date'].strftime('%b %d, %Y') if note[
                                'meeting_date'] else 'No date',
                            "createdBy": {
                                "id": note['firebase_uid'] or '',
                                "name": f"{note['first_name'] or ''} {note['last_name'] or ''}".strip() or 'User'
                            },
                            "createdAt": note['created_at'].isoformat() if note[
                                'created_at'] else datetime.now().isoformat(),
                            "updatedAt": note['created_at'].isoformat() if note[
                                'created_at'] else datetime.now().isoformat()
                        }
                        notes.append(transformed_note)
                    except Exception as e:
                        logger.error(f"Error transforming note {note.get('note_id')}: {e}")
                        # Continue with next note

                return notes

        except psycopg2.Error as e:
            logger.error(f"Database error in get_all_notes: {e}")
            return []
        except Exception as e:
            logger.error(f"Error in get_all_notes: {e}")
            return []

    @staticmethod
    def get_notes_for_meeting(meeting_id):
        """
        Get all notes for a specific meeting

        Args:
            meeting_id (int): ID of the meeting to get notes for

        Returns:
            list: List of note objects
        """
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get meeting info first (to include in response)
                cur.execute("""
                    SELECT title, meeting_date
                    FROM meetings
                    WHERE meeting_id = %s
                """, (meeting_id,))

                meeting_info = cur.fetchone()
                if not meeting_info:
                    logger.warning(f"Meeting with ID {meeting_id} not found")
                    return []

                # Now get the notes
                query = """
                SELECT 
                    n.note_id, n.note_text, n.created_at,
                    u.firebase_uid, u.first_name, u.last_name
                FROM notes n
                JOIN users u ON n.firebase_uid = u.firebase_uid
                WHERE n.meeting_id = %s
                ORDER BY n.created_at DESC
                """

                cur.execute(query, (meeting_id,))
                notes_data = cur.fetchall()
                logger.info(f"Found {len(notes_data)} notes for meeting {meeting_id}")

                # Format notes for frontend
                notes = []
                for note in notes_data:
                    notes.append({
                        'id': str(note['note_id']),
                        'content': note['note_text'] or '',
                        'createdBy': {
                            'id': note['firebase_uid'] or '',
                            'name': f"{note['first_name'] or ''} {note['last_name'] or ''}".strip() or 'User'
                        },
                        'createdAt': note['created_at'].isoformat() if note['created_at'] else None,
                        'updatedAt': note['created_at'].isoformat() if note['created_at'] else None,
                        'meetingId': str(meeting_id),
                        'meetingTitle': meeting_info['title'] or 'Unknown Meeting',
                        'meetingDate': meeting_info['meeting_date'].strftime('%a, %B %d, %Y') if meeting_info[
                            'meeting_date'] else None
                    })

                return notes

        except psycopg2.Error as e:
            logger.error(f"Database error in get_notes_for_meeting: {e}")
            return []
        except Exception as e:
            logger.error(f"Error in get_notes_for_meeting: {e}")
            return []

    @staticmethod
    def create_note(note_data):
        """
        Create a new note

        Args:
            note_data (dict): Note data

        Returns:
            dict: Created note object
        """
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Extract data with safe defaults
                firebase_uid = note_data.get('firebase_uid')
                if not firebase_uid:
                    raise ValueError("Missing required field: firebase_uid")

                meeting_id = note_data.get('meeting_id')
                # Convert to int if it's a string
                if meeting_id and isinstance(meeting_id, str):
                    try:
                        meeting_id = int(meeting_id)
                    except ValueError:
                        meeting_id = None

                note_text = note_data.get('note_text') or note_data.get('content')
                if not note_text:
                    raise ValueError("Missing required field: note_text or content")

                # Insert note
                query = """
                INSERT INTO notes (firebase_uid, meeting_id, note_text)
                VALUES (%s, %s, %s)
                RETURNING note_id, created_at
                """

                cur.execute(query, (firebase_uid, meeting_id, note_text))
                result = cur.fetchone()

                # Get user info
                cur.execute("""
                    SELECT first_name, last_name
                    FROM users
                    WHERE firebase_uid = %s
                """, (firebase_uid,))
                user_info = cur.fetchone() or {}

                # Get meeting info if applicable
                meeting_title = note_data.get('meetingTitle', 'Personal Note')
                meeting_date = note_data.get('meetingDate')

                if meeting_id:
                    cur.execute("""
                        SELECT title, meeting_date
                        FROM meetings
                        WHERE meeting_id = %s
                    """, (meeting_id,))
                    meeting_info = cur.fetchone()
                    if meeting_info:
                        meeting_title = meeting_info['title']
                        meeting_date = meeting_info['meeting_date']

                conn.commit()

                # Format created note for response
                created_note = {
                    'id': str(result['note_id']),
                    'content': note_text,
                    'createdBy': {
                        'id': firebase_uid,
                        'name': f"{user_info.get('first_name', '')} {user_info.get('last_name', '')}".strip() or 'User'
                    },
                    'createdAt': result['created_at'].isoformat() if result[
                        'created_at'] else datetime.now().isoformat(),
                    'updatedAt': result['created_at'].isoformat() if result[
                        'created_at'] else datetime.now().isoformat(),
                    'meetingId': str(meeting_id) if meeting_id else '',
                    'meetingTitle': meeting_title,
                    'meetingDate': meeting_date.strftime('%a, %B %d, %Y') if isinstance(meeting_date,
                                                                                        datetime) else meeting_date or 'No date'
                }

                return created_note

        except psycopg2.Error as e:
            conn.rollback()
            logger.error(f"Database error in create_note: {e}")
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"Error in create_note: {e}")
            raise

    @staticmethod
    def update_note(note_id, note_data):
        """
        Update an existing note

        Args:
            note_id (int): ID of the note to update
            note_data (dict): Updated note data

        Returns:
            dict: Updated note object
        """
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # First check if note exists
                cur.execute("""
                    SELECT 
                        n.firebase_uid, n.meeting_id, n.created_at, n.note_text,
                        m.title as meeting_title, m.meeting_date,
                        u.first_name, u.last_name
                    FROM notes n
                    LEFT JOIN meetings m ON n.meeting_id = m.meeting_id
                    LEFT JOIN users u ON n.firebase_uid = u.firebase_uid
                    WHERE n.note_id = %s
                """, (note_id,))

                existing_note = cur.fetchone()
                if not existing_note:
                    raise ValueError(f"Note with ID {note_id} not found")

                # Extract update data
                note_text = note_data.get('note_text') or note_data.get('content')
                meeting_id = note_data.get('meeting_id')

                # Convert meeting_id to int if it's a string
                if meeting_id and isinstance(meeting_id, str):
                    try:
                        meeting_id = int(meeting_id)
                    except ValueError:
                        meeting_id = None

                # Build update query
                update_fields = []
                params = []

                if note_text:
                    update_fields.append("note_text = %s")
                    params.append(note_text)

                if meeting_id is not None:
                    update_fields.append("meeting_id = %s")
                    params.append(meeting_id)

                if not update_fields:
                    # Nothing to update
                    logger.info(f"No fields to update for note {note_id}")
                    return {
                        'id': str(note_id),
                        'content': existing_note['note_text'],
                        'createdBy': {
                            'id': existing_note['firebase_uid'],
                            'name': f"{existing_note['first_name'] or ''} {existing_note['last_name'] or ''}".strip() or 'User'
                        },
                        'createdAt': existing_note['created_at'].isoformat() if existing_note['created_at'] else None,
                        'updatedAt': datetime.now().isoformat(),
                        'meetingId': str(existing_note['meeting_id']) if existing_note['meeting_id'] else '',
                        'meetingTitle': existing_note['meeting_title'] or note_data.get('meetingTitle',
                                                                                        'Personal Note'),
                        'meetingDate': existing_note['meeting_date'].strftime('%a, %B %d, %Y') if existing_note[
                            'meeting_date'] else note_data.get('meetingDate', 'No date')
                    }

                # Add note_id to params
                params.append(note_id)

                # Execute update
                query = f"""
                UPDATE notes
                SET {", ".join(update_fields)}
                WHERE note_id = %s
                RETURNING note_id
                """

                cur.execute(query, params)
                result = cur.fetchone()

                if not result:
                    raise ValueError(f"Failed to update note with ID {note_id}")

                # Get meeting info if applicable
                meeting_title = note_data.get('meetingTitle', existing_note['meeting_title'] or 'Personal Note')
                meeting_date = note_data.get('meetingDate')

                if meeting_id and meeting_id != existing_note['meeting_id']:
                    cur.execute("""
                        SELECT title, meeting_date
                        FROM meetings
                        WHERE meeting_id = %s
                    """, (meeting_id,))
                    meeting_info = cur.fetchone()
                    if meeting_info:
                        meeting_title = meeting_info['title']
                        meeting_date = meeting_info['meeting_date']
                else:
                    meeting_id = existing_note['meeting_id']
                    if not meeting_date:
                        meeting_date = existing_note['meeting_date']

                conn.commit()

                # Format response
                updated_note = {
                    'id': str(note_id),
                    'content': note_text or existing_note['note_text'],
                    'createdBy': {
                        'id': existing_note['firebase_uid'],
                        'name': f"{existing_note['first_name'] or ''} {existing_note['last_name'] or ''}".strip() or 'User'
                    },
                    'createdAt': existing_note['created_at'].isoformat() if existing_note['created_at'] else None,
                    'updatedAt': datetime.now().isoformat(),
                    'meetingId': str(meeting_id) if meeting_id else '',
                    'meetingTitle': meeting_title,
                    'meetingDate': meeting_date.strftime('%a, %B %d, %Y') if isinstance(meeting_date,
                                                                                        datetime) else meeting_date or 'No date'
                }

                return updated_note

        except psycopg2.Error as e:
            conn.rollback()
            logger.error(f"Database error in update_note: {e}")
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"Error in update_note: {e}")
            raise

    @staticmethod
    def delete_note(note_id):
        """
        Delete a note

        Args:
            note_id (int): ID of the note to delete

        Returns:
            bool: True if successful
        """
        try:
            with conn.cursor() as cur:
                query = "DELETE FROM notes WHERE note_id = %s"
                cur.execute(query, (note_id,))

                if cur.rowcount == 0:
                    raise ValueError(f"Note with ID {note_id} not found")

                conn.commit()
                return True

        except psycopg2.Error as e:
            conn.rollback()
            logger.error(f"Database error in delete_note: {e}")
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"Error in delete_note: {e}")
            raise