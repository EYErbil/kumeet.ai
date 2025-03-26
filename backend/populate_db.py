#!/usr/bin/env python3
"""
Script to populate the database with mock data for the KuMeet application.
This script assumes that init_db.py has been run to create the tables.
"""

import psycopg2
import random
from datetime import datetime, timedelta
import uuid
import json
import sys
import logging
import os
import firebase_admin
from firebase_admin import credentials
from firebase_admin import auth

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Database connection parameters
DB_HOST = os.environ.get('DB_HOST', "localhost")
DB_PORT = os.environ.get('DB_PORT', "5432")
DB_NAME = os.environ.get('DB_NAME', "kumeet")
DB_USER = os.environ.get('DB_USER', "postgres")
DB_PASSWORD = os.environ.get('DB_PASSWORD', "uzay11ilgin")

# Log the environment variables we're using
logger.info(f"Environment: DB_HOST={DB_HOST}, DB_PORT={DB_PORT}, DB_NAME={DB_NAME}, DB_USER={DB_USER}")

DB_PARAMS = {
    "dbname": DB_NAME,
    "user": DB_USER,
    "password": DB_PASSWORD,
    "host": DB_HOST,  # Use "db" for Docker, fallback to localhost
    "port": DB_PORT
}

# Connect to the database
try:
    logger.info(f"Attempting to connect to database at {DB_PARAMS['host']}:{DB_PARAMS['port']}")
    conn = psycopg2.connect(**DB_PARAMS)
    conn.autocommit = False
    logger.info(f"Database connection established to {DB_PARAMS['host']}:{DB_PARAMS['port']}")
except Exception as e:
    logger.error(f"Failed to connect to database: {e}")
    sys.exit(1)


# Initialize Firebase
def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    # Check if Firebase is already initialized
    if len(firebase_admin._apps) > 0:
        logger.info("Firebase is already initialized")
        return

    try:
        # First, look for the service account file in the current directory
        cred_path = os.path.join(os.getcwd(), "firebase-service-account.json")

        # If not found, check in the config directory
        if not os.path.exists(cred_path):
            cred_path = os.path.join(os.getcwd(), "config", "firebase-service-account.json")

        # If still not found, try one more directory
        if not os.path.exists(cred_path):
            cred_path = os.path.join(os.getcwd(), "backend", "config", "firebase-service-account.json")

        if not os.path.exists(cred_path):
            raise FileNotFoundError(
                "Firebase service account key file not found. "
                "Please place your firebase-service-account.json in the current directory or in the config subdirectory."
            )

        # Initialize the app
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        raise


try:
    initialize_firebase()
except Exception as e:
    logger.error(f"Firebase initialization error: {e}")
    sys.exit(1)

# Mock data for users
mock_users = [
    {
        "email": "john.doe@example.com",
        "password": "password123",
        "first_name": "John",
        "last_name": "Doe"
    },
    {
        "email": "jane.smith@example.com",
        "password": "password123",
        "first_name": "Jane",
        "last_name": "Smith"
    },
    {
        "email": "michael.johnson@example.com",
        "password": "password123",
        "first_name": "Michael",
        "last_name": "Johnson"
    },
    {
        "email": "sarah.lee@example.com",
        "password": "password123",
        "first_name": "Sarah",
        "last_name": "Lee"
    },
    {
        "email": "alex.brown@example.com",
        "password": "password123",
        "first_name": "Alex",
        "last_name": "Brown"
    }
]

# Mock data for meeting types
meeting_types = ["Project", "Standup", "Client", "Strategic", "Design", "Development"]

# Mock data for meeting titles
meeting_titles = [
    "Weekly Dev Sync",
    "Project Alpha Planning",
    "SmartSync Feature Launch",
    "Client Onboarding",
    "Design Review",
    "Sprint Planning",
    "Quarterly Review",
    "Backend Implementation",
    "API Integration",
    "UI/UX Workshop"
]

# Mock data for meeting descriptions
meeting_descriptions = [
    "The team discussed project progress, highlighting near-completion of backend and frontend development.",
    "The team convened for a focused discussion on the upcoming launch of the SmartSync feature.",
    "A comprehensive review of the design system and its implementation across various platforms.",
    "Planning session for the upcoming sprint, including task allocation and priority setting.",
    "Discussion about integrating the new authentication system with existing services.",
    "Technical discussion on optimizing database queries for improved performance.",
    "Aligning on the product roadmap for the next quarter.",
    "Introduction to the new team members and overview of current projects.",
    "Addressing client feedback on the latest deliverable.",
    "Strategy meeting for the upcoming product launch."
]

# Save Firebase UIDs for users
firebase_uids = []


def create_firebase_users():
    """Create users in Firebase Authentication"""
    logger.info("Creating users in Firebase...")
    for user_data in mock_users:
        try:
            # Check if user already exists
            try:
                existing_user = auth.get_user_by_email(user_data["email"])
                logger.info(f"User {user_data['email']} already exists in Firebase. UID: {existing_user.uid}")
                firebase_uids.append(existing_user.uid)
                continue
            except:
                # User doesn't exist, create them
                user = auth.create_user(
                    email=user_data["email"],
                    password=user_data["password"],
                    display_name=f"{user_data['first_name']} {user_data['last_name']}",
                    email_verified=True
                )
                logger.info(f"Created user: {user.uid} - {user.email}")
                firebase_uids.append(user.uid)
        except Exception as e:
            logger.error(f"Error creating user {user_data['email']}: {e}")


def check_table_exists(cursor, table_name):
    """Check if a table exists in the database."""
    try:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = %s
            );
        """, (table_name,))
        return cursor.fetchone()[0]
    except Exception as e:
        logger.error(f"Error checking if table {table_name} exists: {e}")
        return False


def clear_tables():
    """Clear existing data from tables"""
    logger.info("Checking and clearing existing data from tables...")

    # List of tables to check and clear, in reverse order of dependencies
    tables = [
        'speaker_statistics',
        'decisions',
        'action_items',
        'notes',
        'meeting_summaries',
        'speakers',
        'speaker_segments',
        'meetings',
        'feedback',
        'users'
    ]

    with conn.cursor() as cur:
        # Check each table exists before attempting to truncate
        for table in tables:
            exists = check_table_exists(cur, table)
            if exists:
                try:
                    logger.info(f"Truncating table {table}")
                    cur.execute(f"TRUNCATE TABLE {table} CASCADE;")
                except Exception as e:
                    logger.error(f"Error truncating {table}: {e}")
                    conn.rollback()
                    return False

        conn.commit()
        return True


def create_users_in_db():
    """Create users in the PostgreSQL database"""
    logger.info("Creating users in database...")
    with conn.cursor() as cur:
        for i, user_data in enumerate(mock_users):
            if i < len(firebase_uids):
                firebase_uid = firebase_uids[i]
                query = """
                INSERT INTO users (firebase_uid, email, first_name, last_name)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (firebase_uid) DO UPDATE
                SET email = EXCLUDED.email,
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name
                RETURNING firebase_uid;
                """
                cur.execute(query, (
                    firebase_uid,
                    user_data["email"],
                    user_data["first_name"],
                    user_data["last_name"]
                ))
                logger.info(f"Created/Updated user in database: {user_data['email']}")

        conn.commit()


def create_meetings():
    """Create mock meetings in the database"""
    logger.info("Creating meetings...")
    meeting_ids = []

    with conn.cursor() as cur:
        # Create 20 meetings
        for i in range(20):
            # Randomly pick a user
            firebase_uid = random.choice(firebase_uids)

            # Generate random dates within the last 30 days
            days_ago = random.randint(0, 30)
            meeting_date = datetime.now() - timedelta(days=days_ago)

            # Duration between 30-90 minutes
            duration_seconds = random.randint(30, 90) * 60

            # Set start time to a business hour
            hour = random.randint(9, 16)
            minute = random.choice([0, 15, 30, 45])
            start_time = meeting_date.replace(hour=hour, minute=minute, second=0)
            end_time = start_time + timedelta(seconds=duration_seconds)

            # Pick random title and description
            title = random.choice(meeting_titles)
            description = random.choice(meeting_descriptions)
            meeting_type = random.choice(meeting_types)

            # Add some variation to titles
            if random.random() > 0.7:
                title += f" - {random.choice(['Planning', 'Review', 'Discussion', 'Brainstorming'])}"

            # Generate mock file paths
            original_video_path = f"videos/{uuid.uuid4()}.mp4"
            audio_path = f"audio/{uuid.uuid4()}.mp3"

            query = """
            INSERT INTO meetings (
                firebase_uid, title, description, meeting_type, meeting_date,
                duration_seconds, original_video_path, audio_path,
                start_time, end_time
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING meeting_id;
            """

            cur.execute(query, (
                firebase_uid,
                title,
                description,
                meeting_type,
                meeting_date,
                duration_seconds,
                original_video_path,
                audio_path,
                start_time,
                end_time
            ))

            meeting_id = cur.fetchone()[0]
            meeting_ids.append(meeting_id)
            logger.info(f"Created meeting: {meeting_id} - {title}")

        conn.commit()

    return meeting_ids


def create_meeting_summaries(meeting_ids):
    """Create meeting summaries for each meeting"""
    logger.info("Creating meeting summaries...")

    summary_types = ["general", "action_items", "decisions"]

    with conn.cursor() as cur:
        for meeting_id in meeting_ids:
            # Create a general summary
            general_summary = f"""
            The team discussed project progress and next steps. Key topics included:

            1. Current development status
            2. Challenges faced during implementation
            3. Timeline adjustments
            4. Resource allocation

            Overall, the meeting was productive with clear action items and next steps defined.
            """

            # Create an action items summary
            action_items_summary = f"""
            Action Items:

            - Complete API documentation by next week
            - Schedule design review session
            - Update project timeline
            - Follow up with client about requirements
            - Prepare demo for next meeting
            """

            # Create a decisions summary
            decisions_summary = f"""
            Decisions:

            1. Adopted the new authentication framework
            2. Scheduled weekly sync meetings
            3. Approved the revised project timeline
            4. Prioritized mobile experience for next release
            5. Allocated additional resources to UI development
            """

            # Insert all three summary types
            for summary_type in summary_types:
                content = ""
                if summary_type == "general":
                    content = general_summary
                elif summary_type == "action_items":
                    content = action_items_summary
                else:
                    content = decisions_summary

                query = """
                INSERT INTO meeting_summaries (meeting_id, summary_type, content)
                VALUES (%s, %s, %s)
                RETURNING summary_id;
                """

                cur.execute(query, (
                    meeting_id,
                    summary_type,
                    content
                ))

            logger.info(f"Created summaries for meeting: {meeting_id}")

        conn.commit()


def create_speaker_segments(meeting_ids):
    """Create speaker segments for each meeting"""
    logger.info("Creating speaker segments...")

    with conn.cursor() as cur:
        for meeting_id in meeting_ids:
            # Get meeting duration
            cur.execute("SELECT duration_seconds FROM meetings WHERE meeting_id = %s", (meeting_id,))
            duration_seconds = cur.fetchone()[0]

            # Create 4-8 speakers
            num_speakers = random.randint(4, 8)
            speaker_labels = [f"speaker_{i}" for i in range(num_speakers)]

            # Create segments
            current_time = 0
            segments_data = []

            while current_time < duration_seconds:
                speaker = random.choice(speaker_labels)
                segment_duration = random.uniform(5, 30)  # 5-30 seconds per segment

                if current_time + segment_duration > duration_seconds:
                    segment_duration = duration_seconds - current_time

                start_time = current_time
                end_time = current_time + segment_duration

                # Generate sample transcript
                transcript_sentences = [
                    "I think we should focus on improving the user experience.",
                    "The timeline for this project needs to be adjusted.",
                    "We've made good progress on the backend implementation.",
                    "Let's discuss the upcoming features for the next release.",
                    "I have concerns about the current architecture.",
                    "We need to address the feedback from our users.",
                    "The testing phase is taking longer than expected.",
                    "Our metrics show positive engagement with the new features.",
                    "I suggest we prioritize the mobile experience.",
                    "The design team has updated the mockups."
                ]

                transcript = " ".join(random.choices(transcript_sentences, k=random.randint(1, 3)))

                segments_data.append({
                    "meeting_id": meeting_id,
                    "speaker_label": speaker,
                    "start_time": start_time,
                    "end_time": end_time,
                    "duration": segment_duration,
                    "transcript": transcript
                })

                current_time = end_time

            # Insert all segments
            for segment in segments_data:
                query = """
                INSERT INTO speaker_segments (
                    meeting_id, speaker_label, start_time, end_time, duration, transcript
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING segment_id;
                """

                cur.execute(query, (
                    segment["meeting_id"],
                    segment["speaker_label"],
                    segment["start_time"],
                    segment["end_time"],
                    segment["duration"],
                    segment["transcript"]
                ))

            logger.info(f"Created speaker segments for meeting: {meeting_id}")

            # Now create speaker mappings
            for speaker_label in set(segment["speaker_label"] for segment in segments_data):
                # Random selection from mock users
                user = random.choice(mock_users)
                identified_name = f"{user['first_name']} {user['last_name']}"

                query = """
                INSERT INTO speakers (meeting_id, speaker_label, identified_name)
                VALUES (%s, %s, %s)
                RETURNING speaker_id;
                """

                cur.execute(query, (meeting_id, speaker_label, identified_name))

            logger.info(f"Created speakers for meeting: {meeting_id}")

        conn.commit()


def create_speaker_statistics(meeting_ids):
    """Create speaker statistics for each meeting"""
    logger.info("Creating speaker statistics...")

    with conn.cursor() as cur:
        for meeting_id in meeting_ids:
            # Get all speakers for this meeting
            cur.execute("""
                SELECT DISTINCT speaker_label FROM speaker_segments 
                WHERE meeting_id = %s
            """, (meeting_id,))

            speakers = [row[0] for row in cur.fetchall()]

            # Get total meeting duration
            cur.execute("SELECT duration_seconds FROM meetings WHERE meeting_id = %s", (meeting_id,))
            total_duration = cur.fetchone()[0]

            # Calculate speaking time for each speaker
            for speaker_label in speakers:
                cur.execute("""
                    SELECT SUM(duration) FROM speaker_segments 
                    WHERE meeting_id = %s AND speaker_label = %s
                """, (meeting_id, speaker_label))

                speaking_time = cur.fetchone()[0] or 0
                speaking_percentage = (speaking_time / total_duration) * 100 if total_duration > 0 else 0
                interruption_count = random.randint(0, 5)  # Random number of interruptions

                query = """
                INSERT INTO speaker_statistics (
                    meeting_id, speaker_label, total_speaking_time, speaking_percentage, interruption_count
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING stat_id;
                """

                cur.execute(query, (
                    meeting_id,
                    speaker_label,
                    speaking_time,
                    speaking_percentage,
                    interruption_count
                ))

            logger.info(f"Created speaker statistics for meeting: {meeting_id}")

        conn.commit()


def create_action_items(meeting_ids):
    """Create action items for each meeting"""
    logger.info("Creating action items...")

    action_item_descriptions = [
        "Update the documentation for the API",
        "Schedule a follow-up meeting with the design team",
        "Implement the authentication feature",
        "Prepare the presentation for the client",
        "Review the pull requests for the new features",
        "Create mockups for the mobile app",
        "Research potential third-party services",
        "Setup the continuous integration pipeline",
        "Optimize database queries for better performance",
        "Write tests for the new components"
    ]

    with conn.cursor() as cur:
        for meeting_id in meeting_ids:
            # Get segments for this meeting
            cur.execute("SELECT segment_id FROM speaker_segments WHERE meeting_id = %s", (meeting_id,))
            segments = [row[0] for row in cur.fetchall()]

            # Get users associated with this meeting
            cur.execute("SELECT firebase_uid FROM meetings WHERE meeting_id = %s", (meeting_id,))
            owner_uid = cur.fetchone()[0]

            # Create 3-7 action items
            num_items = random.randint(3, 7)

            for _ in range(num_items):
                description = random.choice(action_item_descriptions)

                # Due date within the next 14 days
                days_ahead = random.randint(1, 14)
                due_date = (datetime.now() + timedelta(days=days_ahead)).date()

                # Status (80% chance of pending, 20% chance of completed)
                status = "completed" if random.random() < 0.2 else "pending"

                # Randomly assign to a segment
                segment_id = random.choice(segments) if segments else None

                # Randomly assign to a user (sometimes use the meeting owner, sometimes another user)
                if random.random() < 0.7:  # 70% chance of using meeting owner
                    assigned_uid = owner_uid
                else:
                    assigned_uid = random.choice(firebase_uids)

                query = """
                INSERT INTO action_items (
                    firebase_uid, meeting_id, description, due_date, status, segment_id
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING item_id;
                """

                cur.execute(query, (
                    assigned_uid,
                    meeting_id,
                    description,
                    due_date,
                    status,
                    segment_id
                ))

            logger.info(f"Created action items for meeting: {meeting_id}")

        conn.commit()


def create_decisions(meeting_ids):
    """Create decisions for each meeting"""
    logger.info("Creating decisions...")

    decision_descriptions = [
        "Adopt the new authentication framework",
        "Schedule weekly sync meetings",
        "Approve the revised project timeline",
        "Prioritize mobile experience for next release",
        "Allocate additional resources to UI development",
        "Move forward with the proposed architecture",
        "Use PostgreSQL for the database",
        "Implement CI/CD pipeline",
        "Hire additional frontend developers",
        "Update the product roadmap"
    ]

    with conn.cursor() as cur:
        for meeting_id in meeting_ids:
            # Get segments for this meeting
            cur.execute("SELECT segment_id FROM speaker_segments WHERE meeting_id = %s", (meeting_id,))
            segments = [row[0] for row in cur.fetchall()]

            # Create 2-5 decisions
            num_decisions = random.randint(2, 5)

            for _ in range(num_decisions):
                description = random.choice(decision_descriptions)

                # Randomly assign to a segment
                segment_id = random.choice(segments) if segments else None

                query = """
                INSERT INTO decisions (
                    meeting_id, description, segment_id
                )
                VALUES (%s, %s, %s)
                RETURNING decision_id;
                """

                cur.execute(query, (
                    meeting_id,
                    description,
                    segment_id
                ))

            logger.info(f"Created decisions for meeting: {meeting_id}")

        conn.commit()


def create_notes(meeting_ids):
    """Create notes for each meeting"""
    logger.info("Creating notes...")

    note_templates = [
        """
Project Status Update:
- Backend development: 80% complete
- Frontend implementation: 65% complete
- API documentation: In progress
- Quality assurance: Pending

Key discussion points:
1. Technical challenges with authentication
2. Resource allocation for the next sprint
3. Client feedback incorporation
        """,
        """
Meeting Highlights:
- Team presented current progress
- Identified bottlenecks in the development process
- Agreed on revised timeline
- Discussed new feature requests

Action items assigned to team members
Next meeting scheduled for next week
        """,
        """
Strategy Discussion:
1. Market analysis review
2. Competitor feature comparison
3. Product roadmap alignment
4. Resource planning

Decisions:
- Focus on mobile user experience
- Prioritize performance optimization
- Revise Q3 objectives
        """
    ]

    with conn.cursor() as cur:
        for meeting_id in meeting_ids:
            # Get the meeting owner
            cur.execute("SELECT firebase_uid FROM meetings WHERE meeting_id = %s", (meeting_id,))
            owner_uid = cur.fetchone()[0]

            # Create 1-3 notes
            num_notes = random.randint(1, 3)

            for _ in range(num_notes):
                note_text = random.choice(note_templates)

                query = """
                INSERT INTO notes (
                    firebase_uid, meeting_id, note_text
                )
                VALUES (%s, %s, %s)
                RETURNING note_id;
                """

                cur.execute(query, (
                    owner_uid,
                    meeting_id,
                    note_text
                ))

            logger.info(f"Created notes for meeting: {meeting_id}")

        conn.commit()


def main():
    """Main function to populate the database"""
    try:
        # Check if the tables exist
        with conn.cursor() as cur:
            required_tables = ['users', 'meetings', 'speaker_segments', 'speakers', 'meeting_summaries', 'notes']
            all_exist = True
            for table in required_tables:
                exists = check_table_exists(cur, table)
                if not exists:
                    all_exist = False
                    logger.error(f"Table {table} does not exist. Please run init_db.py first.")

            if not all_exist:
                logger.error("Some required tables are missing. Please run init_db.py first.")
                return

        # First, create users in Firebase and get their UIDs
        create_firebase_users()

        if not firebase_uids:
            logger.error("No Firebase users were created or found. Cannot continue.")
            return

        # Clear existing data
        if not clear_tables():
            logger.error("Failed to clear existing data. Aborting.")
            return

        # Create users in the database
        create_users_in_db()

        # Create meetings
        meeting_ids = create_meetings()

        # Create meeting summaries
        create_meeting_summaries(meeting_ids)

        # Create speaker segments
        create_speaker_segments(meeting_ids)

        # Create speaker statistics
        create_speaker_statistics(meeting_ids)

        # Create action items
        create_action_items(meeting_ids)

        # Create decisions
        create_decisions(meeting_ids)

        # Create notes
        create_notes(meeting_ids)

        logger.info("Database population completed successfully!")

    except Exception as e:
        logger.error(f"Error during database population: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    logger.info("Starting database population")
    main()
    logger.info("Database population complete")