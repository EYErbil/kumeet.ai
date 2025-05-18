from db import get_db_connection, transaction
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import logging
import random
import json
import os
from config.settings import settings

# Set up logger
logger = logging.getLogger(__name__)


class MeetingService:
    @staticmethod
    def _format_datetime_for_json(obj):
        """
        Recursively format datetime objects to ISO format strings in a dictionary or list
        """
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: MeetingService._format_datetime_for_json(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [MeetingService._format_datetime_for_json(item) for item in obj]
        return obj

    @staticmethod
    def get_meetings(user_id=None, limit=50, offset=0):
        """
        Get list of meetings with optional filtering by user_id

        Args:
            user_id (str): Optional firebase UID to filter meetings by user
            limit (int): Number of meetings to return
            offset (int): Offset for pagination

        Returns:
            list: List of meeting objects
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Base query
                    query = """
                    SELECT 
                        m.meeting_id, m.firebase_uid, m.title, m.description, 
                        m.meeting_type, m.meeting_date, m.duration_seconds,
                        m.created_at,
                        u.first_name, u.last_name, u.email
                    FROM meetings m
                    JOIN users u ON m.firebase_uid = u.firebase_uid
                    """

                    params = []

                    # Add user filter if provided
                    if user_id:
                        query += " WHERE m.firebase_uid = %s"
                        params.append(user_id)

                    # Add ordering and pagination
                    query += " ORDER BY m.meeting_date DESC LIMIT %s OFFSET %s"
                    params.extend([limit, offset])

                    cur.execute(query, params)
                    meetings = cur.fetchall()

                    # For each meeting, fetch attendees
                    for meeting in meetings:
                        meeting_id = meeting['meeting_id']

                        # Fetch speakers/attendees
                        cur.execute("""
                            SELECT DISTINCT identified_name AS name
                            FROM speakers
                            WHERE meeting_id = %s
                        """, (meeting_id,))

                        attendees = cur.fetchall()
                        meeting['attendees'] = [{'name': attendee['name'], 'avatar': None} for attendee in attendees]

                        # Format date and time for frontend
                        if meeting['meeting_date']:
                            date_obj = meeting['meeting_date']
                            meeting['date'] = date_obj.strftime('%a, %B %d, %Y')

                        # Format duration
                        if meeting['duration_seconds']:
                            meeting['duration'] = f"{meeting['duration_seconds'] // 60}m"

                        # Add owner information
                        meeting['owner'] = {
                            'name': f"{meeting['first_name']} {meeting['last_name']}",
                            'email': meeting['email']
                        }

                        # Add platform information (mocked since we don't have this in DB)
                        meeting['platform'] = 'google' if meeting_id % 2 == 0 else 'teams'

                        # Determine category based on meeting_type
                        meeting['category'] = meeting['meeting_type']

                    # Format for frontend with proper datetime conversion
                    return MeetingService._format_datetime_for_json(meetings)

        except psycopg2.Error as e:
            logger.error(f"Database error in get_meetings: {e}")
            return []
        except Exception as e:
            logger.error(f"Error in get_meetings: {e}")
            return []

    @staticmethod
    def get_meeting_by_id(meeting_id):
        """
        Get a specific meeting by ID with all related data

        Args:
            meeting_id (int): ID of the meeting to retrieve

        Returns:
            dict: Meeting object with all related data
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Get main meeting data
                    query = """
                    SELECT 
                        m.meeting_id, m.firebase_uid, m.title, m.description, 
                        m.meeting_type, m.meeting_date, m.duration_seconds,
                        m.created_at,
                        u.first_name, u.last_name, u.email
                    FROM meetings m
                    JOIN users u ON m.firebase_uid = u.firebase_uid
                    WHERE m.meeting_id = %s
                    """

                    cur.execute(query, (meeting_id,))
                    meeting = cur.fetchone()

                    if not meeting:
                        return None

                    # Format date and time for frontend
                    if meeting['meeting_date']:
                        date_obj = meeting['meeting_date']
                        meeting['date'] = date_obj.strftime('%a, %B %d, %Y')

                    # Format duration
                    if meeting['duration_seconds']:
                        meeting['duration'] = f"{meeting['duration_seconds'] // 60}m"

                    # Get participants/speakers
                    cur.execute("""
                        SELECT DISTINCT s.identified_name AS name, s.speaker_label
                        FROM speakers s
                        WHERE s.meeting_id = %s
                    """, (meeting_id,))

                    participants = cur.fetchall()

                    # Get speaker statistics for additional information
                    participants_with_stats = []
                    for participant in participants:
                        # Get statistics for this speaker
                        cur.execute("""
                            SELECT 
                                total_speaking_time, speaking_percentage, interruption_count
                            FROM speaker_statistics
                            WHERE meeting_id = %s AND speaker_label = %s
                        """, (meeting_id, participant['speaker_label']))

                        stats = cur.fetchone()

                        # Create participant object with stats
                        participant_obj = {
                            'name': participant['name'],
                            'role': 'Participant',  # Default role
                            'avatar': None
                        }

                        if stats:
                            participant_obj['talkTime'] = f"{int(stats['total_speaking_time']) // 60}m"
                            participant_obj['talkPercentage'] = round(stats['speaking_percentage'])
                            participant_obj['participationScore'] = min(100, 100 - round(stats['speaking_percentage']))
                            participant_obj['wpm'] = random.randint(150, 200)  # Mock WPM

                        participants_with_stats.append(participant_obj)

                    meeting['participants'] = participants_with_stats

                    # Get summaries
                    cur.execute("""
                        SELECT summary_type, content
                        FROM meeting_summaries
                        WHERE meeting_id = %s
                    """, (meeting_id,))

                    summaries = cur.fetchall()
                    meeting['summaries'] = {}

                    for summary in summaries:
                        meeting['summaries'][summary['summary_type']] = summary['content']

                    # Get action items
                    cur.execute("""
                        SELECT 
                            ai.item_id, ai.description, ai.due_date, ai.status,
                            u.first_name, u.last_name
                        FROM action_items ai
                        JOIN users u ON ai.firebase_uid = u.firebase_uid
                        WHERE ai.meeting_id = %s
                    """, (meeting_id,))

                    action_items = cur.fetchall()
                    meeting['action_items'] = []

                    for item in action_items:
                        meeting['action_items'].append({
                            'id': item['item_id'],
                            'text': item['description'],
                            'dueDate': item['due_date'].strftime('%Y-%m-%d') if item['due_date'] else None,
                            'completed': item['status'] == 'completed',
                            'assignee': f"{item['first_name']}" if item['first_name'] else "Unassigned"
                        })

                    # Get decisions
                    cur.execute("""
                        SELECT description
                        FROM decisions
                        WHERE meeting_id = %s
                    """, (meeting_id,))

                    decisions = cur.fetchall()
                    meeting['decisions'] = [decision['description'] for decision in decisions]

                    # Get transcript segments
                    cur.execute("""
                        SELECT 
                            ss.speaker_label, ss.start_time, ss.end_time, ss.transcript,
                            s.identified_name
                        FROM speaker_segments ss
                        LEFT JOIN speakers s ON ss.meeting_id = s.meeting_id AND ss.speaker_label = s.speaker_label
                        WHERE ss.meeting_id = %s
                        ORDER BY ss.start_time
                    """, (meeting_id,))

                    segments = cur.fetchall()
                    meeting['transcript_segments'] = []

                    for segment in segments:
                        meeting['transcript_segments'].append({
                            'speaker': segment['identified_name'] or segment['speaker_label'],
                            'start_time': segment['start_time'],
                            'end_time': segment['end_time'],
                            'text': segment['transcript']
                        })

                    return MeetingService._format_datetime_for_json(meeting)

        except psycopg2.Error as e:
            logger.error(f"Database error in get_meeting_by_id: {e}")
            return None
        except Exception as e:
            logger.error(f"Error in get_meeting_by_id: {e}")
            return None

    @staticmethod
    def get_recent_meetings(user_id=None, limit=5):
        """
        Get recent meetings

        Args:
            user_id (str): Optional firebase UID to filter meetings by user
            limit (int): Number of meetings to return

        Returns:
            list: List of recent meeting objects
        """
        meetings = MeetingService.get_meetings(user_id=user_id, limit=limit, offset=0)
        return MeetingService._format_datetime_for_json(meetings)

    @staticmethod
    def get_today_meetings(user_id=None):
        """
        Get meetings scheduled for today

        Args:
            user_id (str): Optional firebase UID to filter meetings by user

        Returns:
            list: List of today's meeting objects
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Base query
                    query = """
                    SELECT 
                        m.meeting_id, m.firebase_uid, m.title,
                        m.meeting_type, m.meeting_date, m.duration_seconds
                    FROM meetings m
                    WHERE DATE(m.meeting_date) = CURRENT_DATE
                    """

                    params = []

                    # Add user filter if provided
                    if user_id:
                        query += " AND m.firebase_uid = %s"
                        params.append(user_id)

                    # Add ordering
                    query += " ORDER BY m.meeting_date ASC"

                    cur.execute(query, params)
                    meetings = cur.fetchall()

                    # Format for frontend
                    today_meetings = []
                    for meeting in meetings:
                        meeting_obj = {
                            'id': meeting['meeting_id'],
                            'title': meeting['title'],
                            'time': meeting['meeting_date'].strftime('%I:%M %p') if meeting['meeting_date'] else 'N/A',
                            'platform': 'google' if meeting['meeting_id'] % 2 == 0 else 'teams'
                        }
                        today_meetings.append(meeting_obj)

                    return MeetingService._format_datetime_for_json(today_meetings)

        except psycopg2.Error as e:
            logger.error(f"Database error in get_today_meetings: {e}")
            return []
        except Exception as e:
            logger.error(f"Error in get_today_meetings: {e}")
            return []

    @staticmethod
    def get_action_items(user_id=None, meeting_id=None, limit=10):
        """
        Get action items with optional filters

        Args:
            user_id (str): Optional firebase UID to filter action items by user
            meeting_id (int): Optional meeting ID to filter action items by meeting
            limit (int): Number of action items to return

        Returns:
            list: List of action item objects
        """
        try:
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Base query
                    query = """
                    SELECT 
                        ai.item_id, ai.description, ai.due_date, ai.status,
                        u.first_name, u.last_name,
                        m.title as meeting_title
                    FROM action_items ai
                    JOIN users u ON ai.firebase_uid = u.firebase_uid
                    JOIN meetings m ON ai.meeting_id = m.meeting_id
                    WHERE 1=1
                    """

                    params = []

                    # Add filters if provided
                    if user_id:
                        query += " AND ai.firebase_uid = %s"
                        params.append(user_id)

                    if meeting_id:
                        query += " AND ai.meeting_id = %s"
                        params.append(meeting_id)

                    # Add ordering and limit
                    query += " ORDER BY ai.due_date ASC LIMIT %s"
                    params.append(limit)

                    cur.execute(query, params)
                    items = cur.fetchall()

                    # Format for frontend
                    action_items = []
                    for item in items:
                        action_item = {
                            'id': item['item_id'],
                            'text': item['description'],
                            'meeting': item['meeting_title'],
                            'completed': item['status'] == 'completed',
                            'dueDate': item['due_date'].strftime('%Y-%m-%d') if item['due_date'] else 'No due date',
                        }
                        action_items.append(action_item)

                    return action_items

        except psycopg2.Error as e:
            logger.error(f"Database error in get_action_items: {e}")
            return []
        except Exception as e:
            logger.error(f"Error in get_action_items: {e}")
            return []

    @staticmethod
    def create_meeting(title, description=None, meeting_type='general', meeting_date=None, duration_seconds=3600, firebase_uid=None, audio_file_path=None):
        """
        Create a new meeting
        
        Args:
            title (str): Meeting title
            description (str): Optional meeting description
            meeting_type (str): Meeting type (default: general)
            meeting_date (datetime): Meeting date (default: now)
            duration_seconds (int): Meeting duration in seconds (default: 3600 - 1 hour)
            firebase_uid (str): Optional user ID (if not provided, uses a default development user)
            audio_file_path (str): Optional path to uploaded audio file to extract duration
            
        Returns:
            int: ID of the created meeting
        """
        try:
            # Default values
            if not meeting_date:
                meeting_date = datetime.now()
            
            # Calculate the duration from the audio file if provided
            if audio_file_path and os.path.exists(audio_file_path):
                try:
                    import moviepy.editor as mp
                    logger.info(f"Extracting duration from audio file: {audio_file_path}")
                    
                    # Load the audio file using moviepy
                    audio_clip = mp.AudioFileClip(audio_file_path)
                    
                    # Get duration in seconds
                    duration_seconds = int(audio_clip.duration)
                    logger.info(f"Extracted duration: {duration_seconds} seconds")
                    
                    # Close the clip to release resources
                    audio_clip.close()
                except Exception as e:
                    logger.error(f"Error extracting audio duration: {e}")
                    # Keep the default duration if extraction fails
                    logger.warning(f"Using default duration of {duration_seconds} seconds")
                
            # Use default firebase_uid for development if none provided
            if not firebase_uid:
                # Check if we're in dev mode
                dev_mode = settings.DEBUG or os.environ.get("FIREBASE_DEVELOPMENT_MODE", "").lower() in ("true", "1", "yes")
                
                if dev_mode:
                    # Use consistent development user ID
                    dev_user_id = "dev-admin-at-example.com"
                    firebase_uid = dev_user_id
                    logger.warning(f"Using default development user ID: {firebase_uid}")
                    
                    # Ensure the user exists in the database
                    with get_db_connection() as conn:
                        with conn.cursor() as cur:
                            cur.execute("SELECT firebase_uid FROM users WHERE firebase_uid = %s", (dev_user_id,))
                            user_exists = cur.fetchone() is not None
                            
                            if not user_exists:
                                logger.warning(f"Development user {dev_user_id} not found in database, creating it")
                                cur.execute("""
                                    INSERT INTO users (firebase_uid, email, first_name, last_name)
                                    VALUES (%s, %s, %s, %s)
                                """, (dev_user_id, "admin@example.com", "Dev", "Admin"))
                                conn.commit()
                else:
                    # Check if user exists in database
                    with get_db_connection() as conn:
                        with conn.cursor() as cur:
                            cur.execute("SELECT firebase_uid FROM users LIMIT 1")
                            result = cur.fetchone()
                            if result:
                                firebase_uid = result[0]
                                logger.warning(f"No user ID provided, using first user in database: {firebase_uid}")
                            else:
                                # Use a specific dev user ID instead of "unknown-user"
                                dev_user_id = "dev-admin-at-example.com"
                                firebase_uid = dev_user_id
                                logger.warning(f"No user ID provided and no users in database. Using dev user: {firebase_uid}")
                                
                                # Create the dev user
                                cur.execute("""
                                    INSERT INTO users (firebase_uid, email, first_name, last_name)
                                    VALUES (%s, %s, %s, %s)
                                """, (dev_user_id, "admin@example.com", "Dev", "Admin"))
                                conn.commit()
            
            with transaction() as conn:
                with conn.cursor() as cur:
                    query = """
                    INSERT INTO meetings (
                        firebase_uid, title, description, meeting_type, 
                        meeting_date, duration_seconds
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING meeting_id;
                    """
                    
                    cur.execute(
                        query, 
                        (firebase_uid, title, description, meeting_type, meeting_date, duration_seconds)
                    )
                    
                    meeting_id = cur.fetchone()[0]
                    logger.info(f"Created meeting with ID {meeting_id} for user {firebase_uid} with duration {duration_seconds} seconds")
                    
                    return meeting_id
                    
        except psycopg2.Error as e:
            logger.error(f"Database error in create_meeting: {e}")
            raise
        except Exception as e:
            logger.error(f"Error in create_meeting: {e}")
            raise

    @staticmethod
    def update_meeting(meeting_id, update_data):
        """Update meeting details"""
        try:
            with transaction() as conn:
                with conn.cursor() as cur:
                    # Build the update query dynamically based on provided fields
                    set_clauses = []
                    values = []
                    
                    if 'title' in update_data:
                        set_clauses.append("title = %s")
                        values.append(update_data['title'])
                        
                    if 'description' in update_data:
                        set_clauses.append("description = %s")
                        values.append(update_data['description'])
                        
                    if 'meeting_type' in update_data:
                        set_clauses.append("meeting_type = %s")
                        values.append(update_data['meeting_type'])
                        
                    if 'meeting_date' in update_data:
                        set_clauses.append("meeting_date = %s")
                        values.append(update_data['meeting_date'])
                        
                    if 'duration_seconds' in update_data:
                        set_clauses.append("duration_seconds = %s")
                        values.append(update_data['duration_seconds'])
                        
                    if 'audio_path' in update_data:
                        set_clauses.append("audio_path = %s")
                        values.append(update_data['audio_path'])
                    
                    if not set_clauses:
                        return False  # Nothing to update
                    
                    # Add meeting_id to values and execute query
                    values.append(meeting_id)
                    
                    query = f"""
                    UPDATE meetings
                    SET {", ".join(set_clauses)}
                    WHERE meeting_id = %s
                    """
                    
                    cur.execute(query, values)
                    return True
                    
        except Exception as e:
            logger.error(f"Error in update_meeting: {e}")
            return False

    @staticmethod
    def delete_meeting(meeting_id):
        """Delete a meeting and all associated data"""
        try:
            with transaction() as conn:
                with conn.cursor() as cur:
                    # Delete all associated data first
                    
                    # Delete speaker statistics
                    cur.execute("DELETE FROM speaker_statistics WHERE meeting_id = %s", (meeting_id,))
                    
                    # Delete decisions
                    cur.execute("DELETE FROM decisions WHERE meeting_id = %s", (meeting_id,))
                    
                    # Delete speakers
                    cur.execute("DELETE FROM speakers WHERE meeting_id = %s", (meeting_id,))
                    
                    # Delete meeting summaries
                    cur.execute("DELETE FROM meeting_summaries WHERE meeting_id = %s", (meeting_id,))
                    
                    # Delete speaker segments
                    cur.execute("DELETE FROM speaker_segments WHERE meeting_id = %s", (meeting_id,))
                    
                    # Delete action items
                    cur.execute("DELETE FROM action_items WHERE meeting_id = %s", (meeting_id,))
                    
                    # Finally, delete the meeting itself
                    cur.execute("DELETE FROM meetings WHERE meeting_id = %s", (meeting_id,))
                    
                    return True
                    
        except Exception as e:
            logger.error(f"Error in delete_meeting: {e}")
            return False