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
            local_results_path = f"./results/{session_id}"

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
                f"{settings.CLUSTER_USER}@{settings.CLUSTER_HOST}:{remote_results_path}",
                local_results_path
            ], check=True)

            # Process pulled results
            local_results_final_path = os.path.join(local_results_path, session_id)
            SummarizationService._process_results(meeting_id, session_id, local_results_final_path)

            return {"success": True, "session_id": session_id,
                    "message": "Summarization job submitted and results processed"}


        except subprocess.CalledProcessError as e:
            logger.error(f"Subprocess error: {e}")
            return {"success": False, "error": f"Subprocess error: {str(e)}"}

        except Exception as e:
            logger.error(f"Unexpected error: {e}")
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
                "transcript": [
                    os.path.join(results_dir, "transcript.csv"),
                    os.path.join(results_dir, f"{session_id}_transcript.csv")
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
            for file_type in ["transcript", "action_items"]:
                if file_type not in found_files:
                    logger.warning(f"{file_type} file not found in {results_dir}")
            
            # Read the summary file
            with open(found_files["summary"], 'r', encoding='utf-8') as f:
                summary = f.read()
            
            # Parse transcript CSV if it exists
            transcript = []
            if "transcript" in found_files:
                transcript = SummarizationService._parse_transcript_csv(found_files["transcript"])
            
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