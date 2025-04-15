from db import conn
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import logging
import random
import db  # Import db module

# Set up logger
logger = logging.getLogger(__name__)


class MeetingService:
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
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Base query
                query = """
                SELECT 
                    m.meeting_id, m.firebase_uid, m.title, m.description, 
                    m.meeting_type, m.meeting_date, m.duration_seconds,
                    m.start_time, m.end_time, m.created_at,
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

                    if meeting['start_time']:
                        meeting['time'] = meeting['start_time'].strftime('%I:%M %p')

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

                return meetings

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
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get main meeting data
                query = """
                SELECT 
                    m.meeting_id, m.firebase_uid, m.title, m.description, 
                    m.meeting_type, m.meeting_date, m.duration_seconds,
                    m.start_time, m.end_time, m.created_at,
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

                if meeting['start_time'] and meeting['end_time']:
                    meeting['time'] = (
                        f"{meeting['start_time'].strftime('%I:%M %p')} - "
                        f"{meeting['end_time'].strftime('%I:%M %p')}"
                    )

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

                # Get notes
                cur.execute("""
                    SELECT 
                        n.note_id, n.note_text, n.created_at,
                        u.first_name, u.last_name
                    FROM notes n
                    JOIN users u ON n.firebase_uid = u.firebase_uid
                    WHERE n.meeting_id = %s
                """, (meeting_id,))

                notes = cur.fetchall()
                meeting['notes'] = []

                for note in notes:
                    meeting['notes'].append({
                        'id': note['note_id'],
                        'content': note['note_text'],
                        'createdBy': {
                            'name': f"{note['first_name']} {note['last_name']}",
                        },
                        'createdAt': note['created_at'].isoformat() if note['created_at'] else None,
                        'updatedAt': note['created_at'].isoformat() if note['created_at'] else None,
                        'meetingId': meeting_id,
                        'meetingTitle': meeting['title'],
                        'meetingDate': meeting['date']
                    })

                # Add owner information
                meeting['owner'] = {
                    'name': f"{meeting['first_name']} {meeting['last_name']}",
                    'email': meeting['email']
                }

                # Add platform information (mocked since we don't have this in DB)
                meeting['platform'] = 'google' if meeting_id % 2 == 0 else 'teams'

                return meeting

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
        return MeetingService.get_meetings(user_id=user_id, limit=limit, offset=0)

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
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Base query
                query = """
                SELECT 
                    m.meeting_id, m.firebase_uid, m.title,
                    m.meeting_type, m.start_time, m.duration_seconds
                FROM meetings m
                WHERE DATE(m.meeting_date) = CURRENT_DATE
                """

                params = []

                # Add user filter if provided
                if user_id:
                    query += " AND m.firebase_uid = %s"
                    params.append(user_id)

                # Add ordering
                query += " ORDER BY m.start_time ASC"

                cur.execute(query, params)
                meetings = cur.fetchall()

                # Format for frontend
                today_meetings = []
                for meeting in meetings:
                    meeting_obj = {
                        'id': meeting['meeting_id'],
                        'title': meeting['title'],
                        'time': meeting['start_time'].strftime('%I:%M %p') if meeting['start_time'] else 'N/A',
                        'platform': 'google' if meeting['meeting_id'] % 2 == 0 else 'teams'
                    }
                    today_meetings.append(meeting_obj)

                return today_meetings

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
    def update_meeting_session_id(meeting_id, session_id):
        """
        Update the session_id for a meeting

        Args:
            meeting_id (int): Meeting ID
            session_id (str): Session ID from summarization process

        Returns:
            bool: True if updated successfully, False otherwise
        """
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE meetings 
                    SET session_id = %s
                    WHERE meeting_id = %s
                """, (session_id, meeting_id))
                conn.commit()
                return True
        except psycopg2.Error as e:
            logger.error(f"Database error in update_meeting_session_id: {e}")
            return False
        except Exception as e:
            logger.error(f"Error in update_meeting_session_id: {e}")
            return False
            
    @staticmethod
    def update_meeting_transcript_path(meeting_id, transcript_path):
        """
        Update the transcript_path for a meeting

        Args:
            meeting_id (int): Meeting ID
            transcript_path (str): Path to the transcript file

        Returns:
            bool: True if updated successfully, False otherwise
        """
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE meetings 
                    SET transcript_path = %s
                    WHERE meeting_id = %s
                """, (transcript_path, meeting_id))
                conn.commit()
                logger.info(f"Updated transcript path for meeting {meeting_id}: {transcript_path}")
                return True
        except psycopg2.Error as e:
            logger.error(f"Database error in update_meeting_transcript_path: {e}")
            return False
        except Exception as e:
            logger.error(f"Error in update_meeting_transcript_path: {e}")
            return False
            
    @staticmethod
    def update_meeting_summary_path(meeting_id, summary_path):
        """
        Update the summary_path for a meeting

        Args:
            meeting_id (int): Meeting ID
            summary_path (str): Path to the summary file

        Returns:
            bool: True if updated successfully, False otherwise
        """
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE meetings 
                    SET summary_path = %s
                    WHERE meeting_id = %s
                """, (summary_path, meeting_id))
                conn.commit()
                logger.info(f"Updated summary path for meeting {meeting_id}: {summary_path}")
                return True
        except psycopg2.Error as e:
            logger.error(f"Database error in update_meeting_summary_path: {e}")
            return False
        except Exception as e:
            logger.error(f"Error in update_meeting_summary_path: {e}")
            return False

    @staticmethod
    def ensure_required_columns():
        """
        Ensure the meetings table has all required columns including transcript_path and summary_path
        
        Returns:
            bool: True if columns exist or were added successfully
        """
        try:
            with conn.cursor() as cur:
                # Check if columns exist
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'meetings' AND table_schema = 'public'
                """)
                columns = [row[0] for row in cur.fetchall()]
                
                # Add columns if they don't exist
                if 'transcript_path' not in columns:
                    logger.info("Adding transcript_path column to meetings table")
                    cur.execute("ALTER TABLE meetings ADD COLUMN transcript_path TEXT")
                
                if 'summary_path' not in columns:
                    logger.info("Adding summary_path column to meetings table")
                    cur.execute("ALTER TABLE meetings ADD COLUMN summary_path TEXT")
                
                # Add session_id column if it doesn't exist
                if 'session_id' not in columns:
                    logger.info("Adding session_id column to meetings table")
                    cur.execute("ALTER TABLE meetings ADD COLUMN session_id TEXT")
                
                conn.commit()
                logger.info("Required columns have been added to meetings table")
                return True
                
        except psycopg2.Error as e:
            logger.error(f"Database error in ensure_required_columns: {e}")
            return False
        except Exception as e:
            logger.error(f"Error in ensure_required_columns: {e}")
            return False

    @staticmethod
    def create_meeting(meeting_data, firebase_uid):
        """
        Create a new meeting in the database
        
        Args:
            meeting_data: MeetingCreate Pydantic model with meeting details
            firebase_uid: Firebase UID of the user creating the meeting
            
        Returns:
            int: ID of the newly created meeting
        """
        try:
            with conn.cursor() as cur:
                # Get current timestamp
                now = datetime.now()
                
                # Ensure we have a valid firebase_uid
                if not firebase_uid or firebase_uid == "default_user":
                    # Try to find an existing user in the database
                    cur.execute("SELECT firebase_uid FROM users LIMIT 1")
                    user_row = cur.fetchone()
                    if user_row:
                        firebase_uid = user_row[0]
                        logger.info(f"Using existing user {firebase_uid} as default")
                    else:
                        # Create a default user if none exists
                        try:
                            cur.execute("""
                                INSERT INTO users (firebase_uid, email, first_name, last_name)
                                VALUES ('default_user', 'default@example.com', 'Default', 'User')
                                RETURNING firebase_uid
                            """)
                            firebase_uid = cur.fetchone()[0]
                            conn.commit()
                            logger.info("Created default user for meeting creation")
                        except psycopg2.Error as e:
                            # If there's an error, fallback to default_user
                            logger.error(f"Error creating default user: {e}")
                            firebase_uid = "default_user"
                
                # Prepare meeting data
                query = """
                INSERT INTO meetings (
                    firebase_uid, title, description, meeting_type, 
                    meeting_date, duration_seconds, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                ) RETURNING meeting_id
                """
                
                # Use the provided firebase_uid
                params = [
                    firebase_uid,
                    meeting_data.title,
                    meeting_data.description,
                    meeting_data.meeting_type,
                    meeting_data.meeting_date or now,
                    meeting_data.duration_seconds,
                    now
                ]
                
                try:
                    cur.execute(query, params)
                    meeting_id = cur.fetchone()[0]
                    conn.commit()
                    
                    logger.info(f"Created new meeting with ID: {meeting_id} for user {firebase_uid}")
                    return meeting_id
                except psycopg2.Error as e:
                    # If there's a foreign key error, try creating the user first
                    if "foreign key constraint" in str(e).lower():
                        logger.warning(f"User {firebase_uid} not found, attempting to create default user")
                        try:
                            cur.execute("""
                                INSERT INTO users (firebase_uid, email, first_name, last_name)
                                VALUES (%s, %s, %s, %s)
                                ON CONFLICT (firebase_uid) DO NOTHING
                                RETURNING firebase_uid
                            """, (firebase_uid, f"{firebase_uid}@example.com", "Default", "User"))
                            conn.commit()
                            
                            # Try the insert again
                            cur.execute(query, params)
                            meeting_id = cur.fetchone()[0]
                            conn.commit()
                            
                            logger.info(f"Created new meeting with ID: {meeting_id} after creating user {firebase_uid}")
                            return meeting_id
                        except Exception as inner_e:
                            logger.error(f"Failed to create user and meeting: {inner_e}")
                            raise
                    else:
                        raise
                
        except psycopg2.Error as e:
            logger.error(f"Database error in create_meeting: {e}")
            conn.rollback()
            raise ValueError(f"Database error: {str(e)}")
        except Exception as e:
            logger.error(f"Error in create_meeting: {e}")
            conn.rollback()
            raise

    @staticmethod
    def update_meeting_transcript_segments(meeting_id, transcript_data):
        """
        Update the transcript segments for a meeting
        
        Args:
            meeting_id (int): Meeting ID
            transcript_data (list): List of transcript segments with speaker, start, end, text
            
        Returns:
            bool: True if updated successfully, False otherwise
        """
        try:
            with conn.cursor() as cur:
                # First delete any existing segments for this meeting
                cur.execute("""
                    DELETE FROM speaker_segments 
                    WHERE meeting_id = %s
                """, (meeting_id,))
                
                # Insert new segments
                for segment in transcript_data:
                    speaker_label = segment.get("speaker", "SPEAKER_0")
                    start_time = segment.get("start", 0)
                    end_time = segment.get("end", 0)
                    duration = end_time - start_time
                    transcript_text = segment.get("text", "")
                    
                    cur.execute("""
                        INSERT INTO speaker_segments 
                        (meeting_id, speaker_label, start_time, end_time, duration, transcript) 
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (meeting_id, speaker_label, start_time, end_time, duration, transcript_text))
                
                conn.commit()
                logger.info(f"Updated {len(transcript_data)} transcript segments for meeting {meeting_id}")
                return True
        except psycopg2.Error as e:
            conn.rollback()
            logger.error(f"Database error in update_meeting_transcript_segments: {e}")
            return False
        except Exception as e:
            conn.rollback() 
            logger.error(f"Error in update_meeting_transcript_segments: {e}")
            return False
    
    @staticmethod
    def add_meeting_summary(meeting_id: int, summary_type: str, content: str) -> bool:
        """
        Add a summary for a meeting
        
        Args:
            meeting_id (int): Meeting ID
            summary_type (str): Type of summary (e.g., "general", "action_items", "decisions")
            content (str): Summary content
            
        Returns:
            bool: True if the summary was added successfully, False otherwise
        """
        try:
            with conn.cursor() as cur:
                # First check if a summary of this type already exists
                cur.execute("""
                    SELECT summary_id FROM meeting_summaries 
                    WHERE meeting_id = %s AND summary_type = %s
                """, (meeting_id, summary_type))
                
                existing = cur.fetchone()
                
                if existing:
                    # Update existing summary
                    cur.execute("""
                        UPDATE meeting_summaries 
                        SET content = %s, created_at = CURRENT_TIMESTAMP
                        WHERE summary_id = %s
                    """, (content, existing[0]))
                    logger.info(f"Updated existing {summary_type} summary for meeting {meeting_id}")
                else:
                    # Insert new summary
                    cur.execute("""
                        INSERT INTO meeting_summaries 
                        (meeting_id, summary_type, content)
                        VALUES (%s, %s, %s)
                        RETURNING summary_id
                    """, (meeting_id, summary_type, content))
                    logger.info(f"Added new {summary_type} summary for meeting {meeting_id}")
                
                conn.commit()
                return True
        except psycopg2.Error as e:
            conn.rollback()
            logger.error(f"Database error in add_meeting_summary: {e}")
            return False
        except Exception as e:
            conn.rollback()
            logger.error(f"Error in add_meeting_summary: {e}")
            return False
    
    @staticmethod
    def add_meeting_decision(meeting_id, description, segment_id=None):
        """
        Add a decision for a meeting
        
        Args:
            meeting_id (int): Meeting ID
            description (str): Decision description
            segment_id (int, optional): Segment ID to link to the decision. Defaults to None.
            
        Returns:
            bool: True if the decision was added successfully, False otherwise
        """
        try:
            with conn.cursor() as cur:
                # Check if this decision already exists for this meeting to avoid duplicates
                cur.execute("""
                    SELECT decision_id FROM decisions 
                    WHERE meeting_id = %s AND description = %s
                """, (meeting_id, description))
                
                existing = cur.fetchone()
                if existing:
                    logger.info(f"Decision already exists for meeting {meeting_id}")
                    return True
                    
                # Insert new decision
                cur.execute("""
                    INSERT INTO decisions 
                    (meeting_id, description, segment_id)
                    VALUES (%s, %s, %s)
                    RETURNING decision_id
                """, (meeting_id, description, segment_id))
                
                conn.commit()
                logger.info(f"Added decision for meeting {meeting_id}")
                return True
        except psycopg2.Error as e:
            conn.rollback()
            logger.error(f"Database error in add_meeting_decision: {e}")
            return False
        except Exception as e:
            conn.rollback()
            logger.error(f"Error in add_meeting_decision: {e}")
            return False