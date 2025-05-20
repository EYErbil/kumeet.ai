import os
import sys
import logging
import json
import subprocess
from pathlib import Path
from datetime import datetime
import csv
from db import get_db_connection, transaction
from config.settings import settings
import time
import textwrap
import re
# Set up logger
logger = logging.getLogger(__name__)

# Add data-preprocess module to Python path
try:
    # Determine the path to the data-preprocess module
    data_preprocess_path = str(Path(__file__).parents[2] / "kumeet.ai-data-preprocess-feature-summarization")
    if data_preprocess_path not in sys.path:
        sys.path.append(data_preprocess_path)
        logger.info(f"Added data-preprocess path to Python path: {data_preprocess_path}")
except Exception as e:
    logger.error(f"Failed to add data-preprocess path to Python path: {str(e)}")


class SummarizationService:
    """
    Service for meeting summarization using the data-preprocess module via Docker
    """

    @staticmethod
    def process_audio_file(audio_file_path, meeting_id, meeting_type="general", focus_question=None):
        try:
            if not os.path.exists(audio_file_path):
                logger.error(f"Audio file does not exist: {audio_file_path}")
                return {"success": False, "error": "Audio file not found"}

            session_id = f"meeting_{meeting_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            filename = os.path.basename(audio_file_path)
            remote_path = f"{settings.CLUSTER_REMOTE_DIR}/{filename}"
            run_script_name = f"run_job_{session_id}.sh"
            remote_script_path = f"{settings.CLUSTER_REMOTE_DIR}/{run_script_name}"
            remote_results_path = f"{settings.CLUSTER_REMOTE_DIR}/results/{session_id}"
            shared_base = os.environ.get("SHARED_VOLUME_PATH", "/app/shared_data")
            results_folder = os.path.join(shared_base, "results")
            local_results_path = os.path.join(results_folder, session_id)

            subprocess.run([
                "scp",
                "-i", "/root/.ssh/id_ed25519",
                "-o", "StrictHostKeyChecking=no",
                "-o", "UserKnownHostsFile=/dev/null",
                audio_file_path,
                f"{settings.CLUSTER_USER}@{settings.CLUSTER_HOST}:{remote_path}"
            ], check=True)

            focus_arg = f"--focus-question \"{focus_question}\"" if focus_question else ""
            job_script = textwrap.dedent(f"""#!/bin/bash
#SBATCH --job-name={session_id}
#SBATCH --output={settings.CLUSTER_REMOTE_DIR}/logs/summary_%j.log
#SBATCH --partition=ai
#SBATCH --account=ai
#SBATCH --qos=ai
#SBATCH --gres=gpu:1
#SBATCH --time=00:30:00
#SBATCH --cpus-per-task=4
#SBATCH --mem=16G

mkdir -p {settings.CLUSTER_REMOTE_DIR}/results/{session_id}
cd {settings.CLUSTER_REMOTE_DIR}
module load python/3.10.6
module load ffmpeg/6.1 
source /kuacc/users/eerbil20/kumeet_summarizer/summarizer/venv/bin/activate

python --version

python /kuacc/users/eerbil20/kumeet_summarizer/summarizer/main.py {remote_path} --meeting-type \"{meeting_type}\" --session-id {session_id} {focus_arg}
""")

            job_script = job_script.lstrip('\n')
            with open(run_script_name, "w", newline="\n") as f:
                f.write(job_script)

            subprocess.run([
                "scp",
                "-i", "/root/.ssh/id_ed25519",
                "-o", "StrictHostKeyChecking=no",
                "-o", "UserKnownHostsFile=/dev/null",
                run_script_name,
                f"{settings.CLUSTER_USER}@{settings.CLUSTER_HOST}:{remote_script_path}"
            ], check=True)

            submit = subprocess.run([
                "ssh",
                "-i", "/root/.ssh/id_ed25519",
                "-o", "StrictHostKeyChecking=no",
                "-o", "UserKnownHostsFile=/dev/null",
                f"{settings.CLUSTER_USER}@{settings.CLUSTER_HOST}",
                f"sbatch {remote_script_path}"
            ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

            job_id_match = re.search(r"Submitted batch job\s+(\d+)", submit.stdout or "")
            if not job_id_match:
                raise RuntimeError("Job ID could not parsed:\n" + submit.stdout)
            job_id = job_id_match.group(1)
            logger.info(f"Job submitted with ID: {job_id}")

            while True:
                check = subprocess.run([
                    "ssh", "-i", "/root/.ssh/id_ed25519", "-o", "StrictHostKeyChecking=no",
                    f"{settings.CLUSTER_USER}@{settings.CLUSTER_HOST}",
                    f"squeue -j {job_id}"
                ], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)

                lines = check.stdout.strip().splitlines()
                if len(lines) <= 1:
                    logger.info(f"Job {job_id} is completed.")
                    break

                logger.info(f"Job {job_id} still running.")
                time.sleep(10)

            os.makedirs(local_results_path, exist_ok=True)
            subprocess.run([
                "scp",
                "-i", "/root/.ssh/id_ed25519",
                "-o", "StrictHostKeyChecking=no",
                "-o", "UserKnownHostsFile=/dev/null",
                "-r",
                f"{settings.CLUSTER_USER}@{settings.CLUSTER_HOST}:{remote_results_path}/*",
                local_results_path
            ], check=True)

            # Process pulled results
            local_results_final_path = local_results_path
            success = SummarizationService._process_results(meeting_id, session_id,
                                                                           local_results_final_path)

            if success:
                logger.info(f"Successfully processed and saved results for meeting {meeting_id}")
                return {"success": True, "session_id": session_id,
                        "message": "Summarization job completed and results processed successfully"}
            else:
                logger.error(f"Failed to process and save results for meeting {meeting_id}")
                return {"success": False, "error": "Failed to process results"}


        except subprocess.CalledProcessError as e:
            logger.error(f"Subprocess error: {e}")
            return {"success": False, "error": f"Subprocess error: {str(e)}"}

        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _save_to_postgres(meeting_id, summary, transcript, action_items):

        try:
            logger.info(f"Starting database update for meeting {meeting_id}")
            with transaction() as conn:
                with conn.cursor() as cursor:

                    cursor.execute("""
                    INSERT INTO meeting_summaries (meeting_id, summary_type, content)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (meeting_id, summary_type) 
                    DO UPDATE SET content = EXCLUDED.content
                    """, (meeting_id, "general", summary))
                    logger.info(f"Summary saved for meeting {meeting_id}")


                    if transcript:
                        logger.info(f"Saving {len(transcript)} transcript segments for meeting {meeting_id}")

                        for segment in transcript:
                            if isinstance(segment,
                                          dict) and 'speaker' in segment and 'start' in segment and 'end' in segment and 'text' in segment:
                                try:
                                    speaker_label = segment.get('speaker')
                                    start_time = float(segment.get('start', 0))
                                    end_time = float(segment.get('end', 0))
                                    text = segment.get('text', '')

                                    cursor.execute("""
                                    INSERT INTO speaker_segments 
                                    (meeting_id, speaker_label, start_time, end_time, transcript)
                                    VALUES (%s, %s, %s, %s, %s)
                                    ON CONFLICT (meeting_id, speaker_label, start_time) 
                                    DO UPDATE SET transcript = EXCLUDED.transcript
                                    """, (
                                        meeting_id,
                                        speaker_label,
                                        start_time,
                                        end_time,
                                        text
                                    ))

                                    cursor.execute("""
                                    INSERT INTO speakers
                                    (meeting_id, speaker_label, identified_name)
                                    VALUES (%s, %s, %s)
                                    ON CONFLICT (meeting_id, speaker_label)
                                    DO NOTHING
                                    """, (
                                        meeting_id,
                                        speaker_label,
                                        speaker_label  # İlk başta speaker_label'ı ad olarak kullan
                                    ))
                                except Exception as seg_err:
                                    logger.error(f"Error inserting transcript segment: {str(seg_err)}")

                        try:
                            cursor.execute("""
                            UPDATE meetings
                            SET transcript_json = %s
                            WHERE meeting_id = %s
                            """, (json.dumps(transcript), meeting_id))
                            logger.info(f"Full transcript JSON saved for meeting {meeting_id}")
                        except Exception as json_err:
                            logger.error(f"Error saving transcript JSON: {str(json_err)}")

                    if action_items:
                        logger.info(f"Saving {len(action_items)} action items for meeting {meeting_id}")

                        cursor.execute("SELECT firebase_uid FROM meetings WHERE meeting_id = %s", (meeting_id,))
                        row = cursor.fetchone()
                        firebase_uid = row[0] if row else None

                        if firebase_uid:
                            for item in action_items:
                                try:
                                    description = item.get('description', '')
                                    if description:  # Boş description'ları engelle
                                        cursor.execute("""
                                        INSERT INTO action_items 
                                        (firebase_uid, meeting_id, description, due_date, status)
                                        VALUES (%s, %s, %s, NULL, 'pending')
                                        """, (
                                            firebase_uid,
                                            meeting_id,
                                            description
                                        ))
                                except Exception as ai_err:
                                    logger.error(f"Error inserting action item: {str(ai_err)}")
                        else:
                            logger.warning(
                                f"Could not find firebase_uid for meeting {meeting_id}, action items not saved")

                    try:
                        SummarizationService._calculate_speaker_statistics(meeting_id)
                    except Exception as stats_err:
                        logger.error(f"Error calculating speaker statistics: {str(stats_err)}")

                logger.info(f"Successfully updated meeting {meeting_id} with summary and action items")
                return True

        except Exception as e:
            logger.error(f"Error saving to PostgreSQL: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    @staticmethod
    def _process_results(meeting_id, session_id, results_dir):
        """Process the results from the data-preprocess container and save to database"""
        try:
            logger.info(f"Processing results for meeting {meeting_id} from {results_dir}")

            # Expected output files with different possible naming patterns
            file_candidates = {
                "summary": [
                    os.path.join(results_dir, "summary.txt"),
                    os.path.join(results_dir, f"{session_id}_summary.txt")
                ],
                "transcript_csv": [
                    os.path.join(results_dir, "transcript.csv"),
                    os.path.join(results_dir, f"{session_id}_transcript.csv")
                ],
                "transcript_json": [
                    os.path.join(results_dir, "transcript.json"),
                    os.path.join(results_dir, f"{session_id}_transcript.json")
                ],
                "action_items": [
                    os.path.join(results_dir, "summary.csv"),
                    os.path.join(results_dir, f"{session_id}_summary.csv")
                ],
                "summary_json": [
                    os.path.join(results_dir, "summary.json"),
                    os.path.join(results_dir, f"{session_id}_summary.json")
                ]
            }

            # Find the actual files that exist
            found_files = {}
            for file_type, paths in file_candidates.items():
                for path in paths:
                    if os.path.exists(path):
                        found_files[file_type] = path
                        logger.info(f"Found {file_type} file at: {path}")
                        break

            # Check if summary file exists (required)
            if "summary" not in found_files:
                logger.error(f"Summary file not found in {results_dir}")
                return False

            # Warning for missing files
            for file_type in ["transcript_csv", "transcript_json", "action_items", "summary_json"]:
                if file_type not in found_files:
                    logger.warning(f"{file_type} file not found in {results_dir}")

            # Read the summary file
            with open(found_files["summary"], 'r', encoding='utf-8') as f:
                summary = f.read()

            # Parse transcript
            transcript = []
            if "transcript_json" in found_files:
                transcript = SummarizationService._parse_transcript_json(found_files["transcript_json"])
                if transcript:
                    SummarizationService._insert_speaker_segments(meeting_id, transcript)
                    # Calculate and insert speaker statistics
                    SummarizationService._calculate_speaker_statistics(meeting_id)
            elif "transcript_csv" in found_files:
                transcript = SummarizationService._parse_transcript_csv(found_files["transcript_csv"])

            # Parse action items CSV if it exists
            action_items = []
            if "action_items" in found_files:
                action_items = SummarizationService._parse_action_items_csv(found_files["action_items"])


            logger.info(f"Summary length: {len(summary)}")
            logger.info(f"Transcript entries: {len(transcript)}")
            logger.info(f"Action items count: {len(action_items)}")

            db_success = SummarizationService._save_to_postgres(meeting_id, summary, transcript, action_items)
            if not db_success:
                logger.error(f"Failed to save data to database for meeting {meeting_id}")
                return False


            if "summary_json" in found_files:
                try:
                    SummarizationService._process_summary_json(meeting_id, found_files["summary_json"])
                except Exception as summary_err:
                    logger.error(f"Error processing summary JSON: {str(summary_err)}")


            logger.info(f"Successfully processed results for meeting {meeting_id}")
            return True

        except Exception as e:
            logger.error(f"Error processing results: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False


    @staticmethod
    def _process_summary_json(meeting_id, file_path):
        """
        Parse summary JSON file and insert into meeting_summaries table

        Args:
            meeting_id (int): ID of the meeting
            file_path (str): Path to the summary.json file
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                summary_data = json.load(f)

            if not summary_data:
                logger.warning(f"Empty summary.json file for meeting {meeting_id}")
                return False

            # Extract and format the content from the summary chunks
            summary_chunks = []
            for item in summary_data:
                # Format each chunk with text and importance score
                chunk_text = item.get('text', '').strip()
                importance = item.get('importance', 5)
                timestamp = item.get('timestamp', '')

                if chunk_text:
                    # Clean up text (remove asterisk if present)
                    if chunk_text.startswith('*'):
                        chunk_text = chunk_text[1:].strip()

                    summary_chunks.append({
                        'text': chunk_text,
                        'importance': importance,
                        'timestamp': timestamp
                    })

            # Sort chunks by importance (descending)
            summary_chunks.sort(key=lambda x: x.get('importance', 0), reverse=True)

            # Format the content - just the list items without a header
            formatted_content = ""
            for i, chunk in enumerate(summary_chunks, 1):
                formatted_content += f"{i}. {chunk['text']} "
                if chunk['timestamp']:
                    formatted_content += f"[{chunk['timestamp']}] "
                formatted_content += f"(Importance: {chunk['importance']})\n\n"

            # Insert into meeting_summaries table
            with transaction() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                       INSERT INTO meeting_summaries (meeting_id, summary_type, content)
                       VALUES (%s, %s, %s)
                       ON CONFLICT (meeting_id, summary_type) 
                       DO UPDATE SET content = EXCLUDED.content
                       """, (meeting_id, "detailed", formatted_content))

            logger.info(f"Successfully inserted summary.json content for meeting {meeting_id}")
            return True

        except Exception as e:
            logger.error(f"Error processing summary.json: {str(e)}")
            return False

    @staticmethod
    def _parse_transcript_json(file_path):
        """Parse transcript JSON file into list of segments format"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                transcript_data = json.load(f)
                logger.info(f"Parsed transcript JSON with {len(transcript_data)} segments")
                return transcript_data
        except Exception as e:
            logger.error(f"Error parsing transcript JSON: {str(e)}")
            return []

    @staticmethod
    def _insert_speaker_segments(meeting_id, transcript_segments):
        """
        Insert transcript segments into speaker_segments table

        Args:
            meeting_id (int): ID of the meeting
            transcript_segments (list): List of transcript segments with speaker, start, end, text fields
        """
        try:
            with transaction() as conn:
                with conn.cursor() as cursor:
                    # First check if any segments already exist for this meeting
                    cursor.execute("""
                           SELECT COUNT(*) FROM speaker_segments WHERE meeting_id = %s
                       """, (meeting_id,))
                    count = cursor.fetchone()[0]

                    # If segments already exist, log and return
                    if count > 0:
                        logger.info(f"Speaker segments already exist for meeting {meeting_id}, skipping insert")
                        return

                    # Insert each segment
                    for segment in transcript_segments:
                        cursor.execute("""
                               INSERT INTO speaker_segments (
                                   meeting_id, speaker_label, start_time, end_time, transcript
                               ) VALUES (%s, %s, %s, %s, %s)
                           """, (
                            meeting_id,
                            segment.get('speaker', 'unknown'),
                            float(segment.get('start', 0)),
                            float(segment.get('end', 0)),
                            segment.get('text', '')
                        ))

                    # Also insert speaker entries for each unique speaker
                    unique_speakers = set(segment.get('speaker', 'unknown') for segment in transcript_segments)
                    for speaker in unique_speakers:
                        # Check if speaker entry already exists
                        cursor.execute("""
                               SELECT COUNT(*) FROM speakers 
                               WHERE meeting_id = %s AND speaker_label = %s
                           """, (meeting_id, speaker))
                        exists = cursor.fetchone()[0] > 0

                        if not exists:
                            cursor.execute("""
                                   INSERT INTO speakers (meeting_id, speaker_label, identified_name)
                                   VALUES (%s, %s, %s)
                               """, (meeting_id, speaker, speaker))

            logger.info(f"Successfully inserted {len(transcript_segments)} speaker segments for meeting {meeting_id}")
            return True
        except Exception as e:
            logger.error(f"Error inserting speaker segments: {str(e)}")
            return False

    @staticmethod
    def _parse_transcript_csv(file_path):
        """Parse transcript CSV file into dictionary format"""
        transcript = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    transcript.append(dict(row))
            return transcript
        except Exception as e:
            logger.error(f"Error parsing transcript CSV: {str(e)}")
            return []

    @staticmethod
    def _calculate_speaker_statistics(meeting_id):
        """
        Calculate speaking time statistics for each speaker and insert into speaker_statistics table

        Args:
            meeting_id (int): ID of the meeting
        """
        try:
            with transaction() as conn:
                with conn.cursor() as cursor:
                    # First check if statistics already exist
                    cursor.execute("""
                           SELECT COUNT(*) FROM speaker_statistics WHERE meeting_id = %s
                       """, (meeting_id,))
                    count = cursor.fetchone()[0]

                    # If statistics already exist, log and return
                    if count > 0:
                        logger.info(f"Speaker statistics already exist for meeting {meeting_id}, skipping calculation")
                        return

                    # Get all distinct speakers for this meeting
                    cursor.execute("""
                           SELECT DISTINCT speaker_label 
                           FROM speaker_segments
                           WHERE meeting_id = %s
                       """, (meeting_id,))

                    speakers = [row[0] for row in cursor.fetchall()]
                    if not speakers:
                        logger.warning(f"No speakers found for meeting {meeting_id}, skipping statistics calculation")
                        return

                    logger.info(f"Calculating statistics for {len(speakers)} speakers in meeting {meeting_id}")

                    # Calculate total speaking time for all speakers
                    cursor.execute("""
                           SELECT SUM(end_time - start_time) as total_time
                           FROM speaker_segments
                           WHERE meeting_id = %s
                       """, (meeting_id,))

                    result = cursor.fetchone()
                    total_speaking_time = float(result[0]) if result and result[0] else 0

                    if total_speaking_time <= 0:
                        logger.warning(
                            f"Total speaking time is zero for meeting {meeting_id}, skipping statistics calculation")
                        return

                    # For each speaker, calculate their speaking time and percentage
                    for speaker_label in speakers:
                        cursor.execute("""
                               SELECT SUM(end_time - start_time) as speaker_time
                               FROM speaker_segments
                               WHERE meeting_id = %s AND speaker_label = %s
                           """, (meeting_id, speaker_label))

                        result = cursor.fetchone()
                        speaker_time = float(result[0]) if result and result[0] else 0
                        speaking_percentage = round((speaker_time / total_speaking_time) * 100, 2)

                        # For now, set interruption_count to 0
                        interruption_count = 0

                        # Insert into speaker_statistics table
                        cursor.execute("""
                               INSERT INTO speaker_statistics (
                                   meeting_id, speaker_label, total_speaking_time, 
                                   speaking_percentage, interruption_count
                               ) VALUES (%s, %s, %s, %s, %s)
                           """, (
                            meeting_id,
                            speaker_label,
                            speaker_time,
                            speaking_percentage,
                            interruption_count
                        ))

                    conn.commit()
                    logger.info(f"Successfully calculated and inserted speaker statistics for meeting {meeting_id}")
                    return True

        except Exception as e:
            logger.error(f"Error calculating speaker statistics: {str(e)}")
            return False

    @staticmethod
    def _parse_action_items_csv(file_path):
        """Parse action items CSV file into list format"""
        action_items = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # The summary.csv file from the data-preprocess has these columns:
                    # chunk, timestamp, text, importance
                    action_items.append({
                        'description': row.get('text', ''),
                        'importance_score': int(row.get('importance', 5)),
                        'timestamp': row.get('timestamp', '')
                    })
            return action_items
        except Exception as e:
            logger.error(f"Error parsing action items CSV: {str(e)}")
            return []

    @staticmethod
    def _update_meeting_with_summary(meeting_id, summary, transcript, action_items):
        """
        Update the meeting in our database with summary information

        Args:
            meeting_id (int): ID of the meeting
            summary (str): Generated summary text
            transcript (dict): Transcript data
            action_items (list): Extracted action items
        """
        try:
            with transaction() as conn:
                with conn.cursor() as cursor:
                    # Update the meeting with summary
                    cursor.execute("""
                       INSERT INTO meeting_summaries (meeting_id, summary_type, content)
                       VALUES (%s, %s, %s)
                       ON CONFLICT (meeting_id, summary_type) 
                       DO UPDATE SET content = EXCLUDED.content
                       """, (meeting_id, "general", summary))

                    # Store transcript in a JSON field
                    if transcript:
                        cursor.execute("""
                           UPDATE meetings
                           SET transcript_json = %s
                           WHERE meeting_id = %s
                           """, (json.dumps(transcript), meeting_id))

                    # Store action items
                    for item in action_items:
                        cursor.execute("""
                           INSERT INTO action_items 
                           (firebase_uid, meeting_id, description, due_date, status)
                           SELECT firebase_uid, %s, %s, NULL, 'pending'
                           FROM meetings
                           WHERE meeting_id = %s
                           """, (
                            meeting_id,
                            item.get('description', ''),
                            meeting_id
                        ))

            logger.info(f"Updated meeting {meeting_id} with summary and action items")
            return True
        except Exception as e:
            logger.error(f"Error updating meeting with summary: {str(e)}")
            return False

    @staticmethod
    def get_meeting_summary(meeting_id):
        """
        Get the summary for a meeting

        Args:
            meeting_id (int): ID of the meeting

        Returns:
            dict: Summary data or None
        """
        try:
            query = """
               SELECT summary_type, content, created_at
               FROM meeting_summaries
               WHERE meeting_id = %s
               """

            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, (meeting_id,))
                    summaries = cursor.fetchall()

            if not summaries:
                return None

            result = {}
            for summary_type, content, created_at in summaries:
                result[summary_type] = {
                    "content": content,
                    "created_at": created_at
                }

            return result
        except Exception as e:
            logger.error(f"Error getting meeting summary: {str(e)}")
            return None
