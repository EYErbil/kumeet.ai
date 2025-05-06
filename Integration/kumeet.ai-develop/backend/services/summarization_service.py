import os
import sys
import logging
import json
import subprocess
import shutil
from pathlib import Path
from datetime import datetime
import csv
from db import get_db_connection, transaction
from config.settings import settings
import requests

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
        """Process an audio file using the containerized data-preprocess service"""
        try:
            # Validate input parameters
            if not os.path.exists(audio_file_path):
                logger.error(f"Audio file does not exist: {audio_file_path}")
                return {"success": False, "error": f"Audio file not found: {audio_file_path}"}
            
            if not meeting_id:
                logger.error("Meeting ID is required")
                return {"success": False, "error": "Meeting ID is required"}
            
            # Generate a unique session ID
            session_id = f"meeting_{meeting_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Get the shared volume path from settings
            shared_volume = os.environ.get("SHARED_VOLUME_PATH", "/app/shared_data")
            
            # Prepare the shared file path
            filename = os.path.basename(audio_file_path)
            shared_file_path = os.path.join(shared_volume, "uploads", filename)
            
            # Create directory if it doesn't exist
            upload_dir = os.path.dirname(shared_file_path)
            if not os.path.exists(upload_dir):
                logger.info(f"Creating upload directory: {upload_dir}")
                os.makedirs(upload_dir, exist_ok=True)
            
            # Check if the source and destination are the same file
            if os.path.abspath(audio_file_path) == os.path.abspath(shared_file_path):
                logger.info(f"Source and destination are the same file, skipping copy: {audio_file_path}")
            else:
                # Copy file to shared volume only if they're different paths
                try:
                    shutil.copy(audio_file_path, shared_file_path)
                    logger.info(f"Successfully copied audio file to shared volume: {shared_file_path}")
                except Exception as e:
                    logger.error(f"Failed to copy audio file to shared volume: {str(e)}")
                    return {"success": False, "error": f"Failed to copy audio file: {str(e)}"}
            
            # Verify the container is running before attempting to execute command
            try:
                # Skip Docker check when running inside Docker
                # This command only works when running outside containers with Docker CLI installed
                if os.environ.get("SKIP_DOCKER_CHECK", "true").lower() in ["true", "1", "yes"]:
                    logger.info("Skipping Docker container check (running inside container)")
                else:
                    check_cmd = ["docker", "ps", "--filter", "name=kumeet-data-preprocess", "--format", "{{.Names}}"]
                    result = subprocess.run(check_cmd, capture_output=True, text=True)
                    
                    if "kumeet-data-preprocess" not in result.stdout:
                        logger.error("Data preprocessing container is not running")
                        return {"success": False, "error": "Data preprocessing container is not running"}
            except Exception as e:
                logger.error(f"Failed to check container status: {str(e)}")
                # Continue anyway since we're likely running in Docker
                logger.info("Continuing despite container check failure (assuming running in Docker)")
            
            # Construct the docker command to run the data-preprocess container
            cmd = [
                "docker", "exec", "kumeet-data-preprocess",
                "python", "summarizer/main.py", 
                f"/app/shared_data/uploads/{filename}",
                "--session-id", session_id,
                "--meeting-type", meeting_type,
                "--quality", "better"
            ]
            
            # Add focus question if provided
            if focus_question:
                safe_focus_question = focus_question.replace('"', '\\"')  # Escape double quotes
                cmd.extend(["--focus-question", f'"{safe_focus_question}"'])
            
            # Execute the command
            logger.info(f"Running data-preprocess command: {' '.join(cmd)}")
            try:
                process = subprocess.run(
                    cmd, 
                    capture_output=True,
                    text=True,
                    timeout=1800  # 30 minute timeout for large files
                )
            except subprocess.TimeoutExpired:
                logger.error("Data preprocessing timed out after 30 minutes")
                return {"success": False, "error": "Data preprocessing timed out after 30 minutes"}
            except Exception as e:
                logger.error(f"Failed to execute data-preprocess command: {str(e)}")
                return {"success": False, "error": f"Failed to execute data-preprocess command: {str(e)}"}
            
            # Check if the command was successful
            if process.returncode != 0:
                error_msg = process.stderr or "Unknown error"
                logger.error(f"Data-preprocess container error: {error_msg}")
                return {"success": False, "error": error_msg}
            
            # Log the output for debugging
            logger.info(f"Data-preprocess stdout: {process.stdout[:500]}...")
            
            # The results will be in the results directory inside the shared volume
            # with a subfolder named with the session_id
            results_dir = os.path.join(shared_volume, "results", session_id)
            
            # Process and update our database with the results
            processed = SummarizationService._process_results(meeting_id, session_id, results_dir)
            
            if not processed:
                return {"success": False, "error": "Failed to process results"}
            
            # Success!
            logger.info(f"Successfully processed audio file for meeting {meeting_id} with session {session_id}")
            return {
                "success": True,
                "session_id": session_id,
                "message": "Processing completed successfully"
            }
            
        except Exception as e:
            logger.error(f"Error processing audio file: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}

    @staticmethod
    def _process_results(meeting_id, session_id, results_dir):
        """Process the results from the data-preprocess container"""
        try:
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
            for file_type in ["transcript_csv", "transcript_json", "action_items"]:
                if file_type not in found_files:
                    logger.warning(f"{file_type} file not found in {results_dir}")
            
            # Read the summary file
            with open(found_files["summary"], 'r', encoding='utf-8') as f:
                summary = f.read()
            
            # Parse transcript CSV if it exists
            transcript = []
            if "transcript_csv" in found_files:
                transcript = SummarizationService._parse_transcript_csv(found_files["transcript_csv"])
            
            # Parse transcript JSON if it exists and insert into speaker_segments table
            if "transcript_json" in found_files:
                transcript_segments = SummarizationService._parse_transcript_json(found_files["transcript_json"])
                if transcript_segments:
                    SummarizationService._insert_speaker_segments(meeting_id, transcript_segments)
                    # Calculate and insert speaker statistics
                    SummarizationService._calculate_speaker_statistics(meeting_id)
            
            # Parse action items CSV if it exists
            action_items = []
            if "action_items" in found_files:
                action_items = SummarizationService._parse_action_items_csv(found_files["action_items"])
            
            # Update the database with the results
            SummarizationService._update_meeting_with_summary(
                meeting_id, summary, transcript, action_items
            )
            
            logger.info(f"Successfully processed results for meeting {meeting_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing results: {str(e)}")
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
                        logger.warning(f"Total speaking time is zero for meeting {meeting_id}, skipping statistics calculation")
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