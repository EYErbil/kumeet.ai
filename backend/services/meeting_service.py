from db import conn
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import logging
import random

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