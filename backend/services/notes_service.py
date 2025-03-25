from db import conn
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import logging

# Set up logger
logger = logging.getLogger(__name__)


class NotesService:
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

                # Format notes for frontend
                notes = []
                for note in notes_data:
                    notes.append({
                        'id': str(note['note_id']),  # Convert to string for frontend
                        'content': note['note_text'],
                        'createdBy': {
                            'id': note['firebase_uid'],
                            'name': f"{note['first_name']} {note['last_name']}"
                        },
                        'createdAt': note['created_at'].isoformat() if note['created_at'] else None,
                        'updatedAt': note['created_at'].isoformat() if note['created_at'] else None,
                        'meetingId': str(meeting_id),
                        'meetingTitle': meeting_info['title'],
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
            note_data (dict): Note data including meetingId, content, and createdBy

        Returns:
            dict: Created note object
        """
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Insert note
                query = """
                INSERT INTO notes (firebase_uid, meeting_id, note_text)
                VALUES (%s, %s, %s)
                RETURNING note_id, created_at
                """

                firebase_uid = note_data.get('createdBy', {}).get('id')
                meeting_id = note_data.get('meetingId')
                content = note_data.get('content')

                if not all([firebase_uid, meeting_id, content]):
                    raise ValueError("Missing required fields: firebase_uid, meeting_id, or content")

                cur.execute(query, (firebase_uid, meeting_id, content))
                result = cur.fetchone()

                # Get meeting info for response
                cur.execute("""
                    SELECT title, meeting_date
                    FROM meetings
                    WHERE meeting_id = %s
                """, (meeting_id,))

                meeting_info = cur.fetchone()

                # Get user info
                cur.execute("""
                    SELECT first_name, last_name
                    FROM users
                    WHERE firebase_uid = %s
                """, (firebase_uid,))

                user_info = cur.fetchone()

                conn.commit()

                # Format response
                created_note = {
                    'id': str(result['note_id']),
                    'content': content,
                    'createdBy': {
                        'id': firebase_uid,
                        'name': f"{user_info['first_name']} {user_info['last_name']}" if user_info else "User"
                    },
                    'createdAt': result['created_at'].isoformat() if result['created_at'] else None,
                    'updatedAt': result['created_at'].isoformat() if result['created_at'] else None,
                    'meetingId': str(meeting_id),
                    'meetingTitle': meeting_info['title'] if meeting_info else "Meeting",
                    'meetingDate': meeting_info['meeting_date'].strftime('%a, %B %d, %Y') if meeting_info and
                                                                                             meeting_info[
                                                                                                 'meeting_date'] else None
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
                        n.firebase_uid, n.meeting_id, n.created_at,
                        m.title as meeting_title, m.meeting_date,
                        u.first_name, u.last_name
                    FROM notes n
                    JOIN meetings m ON n.meeting_id = m.meeting_id
                    JOIN users u ON n.firebase_uid = u.firebase_uid
                    WHERE n.note_id = %s
                """, (note_id,))

                existing_note = cur.fetchone()
                if not existing_note:
                    raise ValueError(f"Note with ID {note_id} not found")

                # Update the note
                query = """
                UPDATE notes
                SET note_text = %s
                WHERE note_id = %s
                RETURNING note_id
                """

                content = note_data.get('content')
                if not content:
                    raise ValueError("Missing required field: content")

                cur.execute(query, (content, note_id))
                result = cur.fetchone()

                if not result:
                    raise ValueError(f"Failed to update note with ID {note_id}")

                conn.commit()

                # Format response
                updated_note = {
                    'id': str(note_id),
                    'content': content,
                    'createdBy': {
                        'id': existing_note['firebase_uid'],
                        'name': f"{existing_note['first_name']} {existing_note['last_name']}"
                    },
                    'createdAt': existing_note['created_at'].isoformat() if existing_note['created_at'] else None,
                    'updatedAt': datetime.now().isoformat(),
                    'meetingId': str(existing_note['meeting_id']),
                    'meetingTitle': existing_note['meeting_title'],
                    'meetingDate': existing_note['meeting_date'].strftime('%a, %B %d, %Y') if existing_note[
                        'meeting_date'] else None
                }

                # Include any additional fields passed in note_data (except content which we've already handled)
                for key, value in note_data.items():
                    if key != 'content' and key not in updated_note:
                        updated_note[key] = value

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