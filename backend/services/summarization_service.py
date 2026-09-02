import csv
import json
import logging
import os
import re
import shlex
import subprocess
import tempfile
import textwrap
import time
from datetime import datetime
from pathlib import Path, PurePosixPath

from config.settings import settings
from db import get_db_connection, transaction


logger = logging.getLogger(__name__)


class SummarizationService:
    """Process meeting recordings and import worker results.

    Processing is disabled in the public stack by default. Cluster mode is
    available only when an operator supplies all SSH and Slurm configuration.
    """

    @staticmethod
    def _cluster_configuration_errors():
        required = {
            "CLUSTER_HOST": settings.CLUSTER_HOST,
            "CLUSTER_USER": settings.CLUSTER_USER,
            "CLUSTER_REMOTE_DIR": settings.CLUSTER_REMOTE_DIR,
            "CLUSTER_WORKER_SCRIPT": settings.CLUSTER_WORKER_SCRIPT,
        }
        errors = [
            f"{name} is required"
            for name, value in required.items()
            if not value
        ]

        address_pattern = re.compile(r"^[A-Za-z0-9._:-]+$")
        path_pattern = re.compile(r"^[A-Za-z0-9_./-]+$")

        if settings.CLUSTER_HOST and not address_pattern.fullmatch(settings.CLUSTER_HOST):
            errors.append("CLUSTER_HOST contains unsupported characters")
        if settings.CLUSTER_USER and not address_pattern.fullmatch(settings.CLUSTER_USER):
            errors.append("CLUSTER_USER contains unsupported characters")
        if settings.CLUSTER_REMOTE_DIR and not path_pattern.fullmatch(
            settings.CLUSTER_REMOTE_DIR
        ):
            errors.append("CLUSTER_REMOTE_DIR must be a simple POSIX path")
        if settings.CLUSTER_WORKER_SCRIPT and not path_pattern.fullmatch(
            settings.CLUSTER_WORKER_SCRIPT
        ):
            errors.append("CLUSTER_WORKER_SCRIPT must be a simple POSIX path")
        if not path_pattern.fullmatch(settings.CLUSTER_PYTHON_EXECUTABLE):
            errors.append("CLUSTER_PYTHON_EXECUTABLE contains unsupported characters")

        for name, value in (
            ("CLUSTER_SSH_KEY_PATH", settings.CLUSTER_SSH_KEY_PATH),
            ("CLUSTER_KNOWN_HOSTS_PATH", settings.CLUSTER_KNOWN_HOSTS_PATH),
        ):
            if not value or not Path(value).is_file():
                errors.append(f"{name} must point to a mounted readable file")

        return errors

    @staticmethod
    def _ssh_options():
        return [
            "-i",
            settings.CLUSTER_SSH_KEY_PATH,
            "-o",
            "BatchMode=yes",
            "-o",
            "IdentitiesOnly=yes",
            "-o",
            "StrictHostKeyChecking=yes",
            "-o",
            f"UserKnownHostsFile={settings.CLUSTER_KNOWN_HOSTS_PATH}",
        ]

    @staticmethod
    def _slurm_directives(session_id, remote_log_path):
        directives = [
            ("job-name", session_id),
            ("output", remote_log_path),
            ("partition", settings.SLURM_PARTITION),
            ("account", settings.SLURM_ACCOUNT),
            ("qos", settings.SLURM_QOS),
            ("gres", settings.SLURM_GRES),
            ("time", settings.SLURM_TIME),
            ("cpus-per-task", settings.SLURM_CPUS_PER_TASK),
            ("mem", settings.SLURM_MEMORY),
            ("nodelist", settings.SLURM_NODELIST),
        ]

        lines = []
        for name, value in directives:
            if value in (None, ""):
                continue
            rendered = str(value)
            if "\n" in rendered or "\r" in rendered:
                raise ValueError(f"Invalid newline in Slurm setting: {name}")
            lines.append(f"#SBATCH --{name}={rendered}")
        return lines

    @staticmethod
    def process_audio_file(
        audio_file_path,
        meeting_id,
        meeting_type="general",
        focus_question=None,
    ):
        if settings.PROCESSING_MODE == "disabled":
            return {
                "success": False,
                "error": (
                    "AI processing is disabled. Configure the optional cluster "
                    "worker and set PROCESSING_MODE=cluster."
                ),
            }

        if settings.PROCESSING_MODE != "cluster":
            return {
                "success": False,
                "error": f"Unsupported processing mode: {settings.PROCESSING_MODE}",
            }

        errors = SummarizationService._cluster_configuration_errors()
        if errors:
            return {
                "success": False,
                "error": "Cluster processing is not configured: " + "; ".join(errors),
            }

        source_path = Path(audio_file_path)
        if not source_path.is_file():
            logger.error("Audio file does not exist: %s", source_path)
            return {"success": False, "error": "Audio file not found"}

        session_id = (
            f"meeting_{int(meeting_id)}_"
            f"{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )
        remote_root = PurePosixPath(settings.CLUSTER_REMOTE_DIR)
        remote_input = remote_root / "uploads" / (
            session_id + source_path.suffix.lower()
        )
        remote_script = remote_root / "jobs" / f"run_{session_id}.sh"
        remote_results = remote_root / "results" / session_id
        remote_log = remote_root / "logs" / "summary_%j.log"

        shared_base = Path(settings.SHARED_VOLUME_PATH)
        local_results = shared_base / "results" / session_id
        local_results.mkdir(parents=True, exist_ok=True)

        remote_address = f"{settings.CLUSTER_USER}@{settings.CLUSTER_HOST}"
        ssh_options = SummarizationService._ssh_options()
        ssh_command = ["ssh", *ssh_options, remote_address]
        scp_command = ["scp", *ssh_options]

        mkdir_command = "mkdir -p " + " ".join(
            shlex.quote(str(path))
            for path in (
                remote_root / "uploads",
                remote_root / "jobs",
                remote_root / "logs",
                remote_results,
            )
        )

        job_arguments = [
            settings.CLUSTER_PYTHON_EXECUTABLE,
            settings.CLUSTER_WORKER_SCRIPT,
            str(remote_input),
            "--meeting-type",
            str(meeting_type),
            "--session-id",
            session_id,
        ]
        if focus_question:
            job_arguments.extend(["--focus-question", str(focus_question)])

        worker_command = " ".join(shlex.quote(value) for value in job_arguments)
        directives = SummarizationService._slurm_directives(
            session_id,
            str(remote_log),
        )
        script_parts = [
            "#!/bin/bash",
            *directives,
            "",
            "set -euo pipefail",
            f"mkdir -p {shlex.quote(str(remote_results))}",
            f"cd {shlex.quote(str(remote_root))}",
            (
                "export RESULTS_DIR="
                + shlex.quote(str(remote_root / "results"))
            ),
        ]
        if settings.CLUSTER_SETUP_COMMANDS.strip():
            script_parts.append(settings.CLUSTER_SETUP_COMMANDS.strip())
        script_parts.append(worker_command)
        job_script = textwrap.dedent("\n".join(script_parts)).lstrip("\n") + "\n"

        temporary_script = None
        try:
            subprocess.run(
                [*ssh_command, mkdir_command],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            subprocess.run(
                [
                    *scp_command,
                    str(source_path),
                    f"{remote_address}:{remote_input}",
                ],
                check=True,
            )

            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                newline="\n",
                suffix=".sh",
                delete=False,
            ) as handle:
                handle.write(job_script)
                temporary_script = Path(handle.name)

            subprocess.run(
                [
                    *scp_command,
                    str(temporary_script),
                    f"{remote_address}:{remote_script}",
                ],
                check=True,
            )

            submit = subprocess.run(
                [
                    *ssh_command,
                    f"sbatch {shlex.quote(str(remote_script))}",
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            job_id_match = re.search(
                r"Submitted batch job\s+(\d+)",
                submit.stdout or "",
            )
            if not job_id_match:
                raise RuntimeError("Slurm did not return a job identifier.")

            job_id = job_id_match.group(1)
            logger.info("Submitted summarization job %s", job_id)
            deadline = (
                time.monotonic() + settings.CLUSTER_JOB_TIMEOUT_SECONDS
            )

            while True:
                if time.monotonic() >= deadline:
                    raise TimeoutError(
                        f"Summarization job {job_id} exceeded the configured timeout."
                    )

                check = subprocess.run(
                    [*ssh_command, f"squeue -h -j {job_id}"],
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )
                if not check.stdout.strip():
                    break
                time.sleep(settings.CLUSTER_POLL_INTERVAL_SECONDS)

            subprocess.run(
                [
                    *scp_command,
                    "-r",
                    f"{remote_address}:{remote_results}/.",
                    str(local_results),
                ],
                check=True,
            )

            success = SummarizationService._process_results(
                meeting_id,
                session_id,
                str(local_results),
            )
            if not success:
                return {"success": False, "error": "Failed to import worker results"}

            return {
                "success": True,
                "session_id": session_id,
                "message": "Summarization completed and results were imported.",
            }

        except subprocess.CalledProcessError as exc:
            logger.error("Cluster command failed with status %s", exc.returncode)
            return {
                "success": False,
                "error": "The configured cluster command failed.",
            }
        except Exception as exc:
            logger.exception("Audio processing failed")
            return {"success": False, "error": str(exc)}
        finally:
            if temporary_script is not None:
                temporary_script.unlink(missing_ok=True)

    @staticmethod
    def _save_to_postgres(meeting_id, summary, transcript, action_items, decisions):

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
                    logger.info(f"Overview saved for meeting {meeting_id}")


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
                                    description = item.get('action', '') or item.get('description', '')
                                    if description:
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
                    if decisions:
                        logger.info(f"Saving {len(decisions)} decisions for meeting {meeting_id}")
                        for decision in decisions:
                            try:
                                decision_text = decision.get('decision', '') or decision.get('description', '')
                                if decision_text:  # Boş decision'ları engelle
                                    cursor.execute("""
                                                        INSERT INTO decisions 
                                                        (meeting_id, description)
                                                        VALUES (%s, %s)
                                                        """, (meeting_id, decision_text))
                            except Exception as dec_err:
                                logger.error(f"Error inserting decision: {str(dec_err)}")

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
                "overview": [
                    os.path.join(results_dir, "overview.txt"),
                    os.path.join(results_dir, f"{session_id}_overview.txt")
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
                    os.path.join(results_dir, "action_items.json"),
                    os.path.join(results_dir, f"{session_id}_action_items.json")
                ],
                "decisions": [
                    os.path.join(results_dir, "decisions.json"),
                    os.path.join(results_dir, f"{session_id}_decisions.json")
                ],
                "summary_json": [
                    os.path.join(results_dir, "summary.json"),
                    os.path.join(results_dir, f"{session_id}_summary.json"),
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
            if "overview" not in found_files:
                logger.error(f"Summary file not found in {results_dir}")
                return False

            # Warning for missing files
            for file_type in ["transcript_csv", "transcript_json", "action_items", "summary_json", "decisions"]:
                if file_type not in found_files:
                    logger.warning(f"{file_type} file not found in {results_dir}")

            # Read the summary file
            with open(found_files["overview"], 'r', encoding='utf-8') as f:
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
                action_items = SummarizationService._parse_action_items_json(found_files["action_items"])

            decisions = []
            if "decisions" in found_files:
                decisions = SummarizationService._parse_decisions_json(found_files["decisions"])

            logger.info(f"Summary length: {len(summary)}")
            logger.info(f"Transcript entries: {len(transcript)}")
            logger.info(f"Action items count: {len(action_items)}")
            logger.info(f"Decisions count: {len(decisions)}")

            db_success = SummarizationService._save_to_postgres(meeting_id, summary, transcript, action_items, decisions)
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
    def _parse_action_items_json(file_path):
        """Parse action items JSON file into list format"""
        action_items = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                action_items_data = json.load(f)

            if isinstance(action_items_data, list):
                # If it's a list of action items
                for item in action_items_data:
                    if isinstance(item, dict):
                        action_items.append({
                            'action': item.get('action', '') or item.get('description', ''),
                            'importance_score': item.get('importance', 5),
                            'timestamp': item.get('timestamp', '')
                        })
                    elif isinstance(item, str):
                        # If it's just a string
                        action_items.append({
                            'action': item,
                            'importance_score': 5,
                            'timestamp': ''
                        })
            elif isinstance(action_items_data, dict):
                # If it's a single action item
                action_items.append({
                    'action': action_items_data.get('action', '') or action_items_data.get('description', ''),
                    'importance_score': action_items_data.get('importance', 5),
                    'timestamp': action_items_data.get('timestamp', '')
                })

            logger.info(f"Parsed {len(action_items)} action items from JSON")
            return action_items
        except Exception as e:
            logger.error(f"Error parsing action items JSON: {str(e)}")
            return []

    @staticmethod
    def _parse_decisions_json(file_path):
        """Parse decisions JSON file into list format"""
        decisions = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                decisions_data = json.load(f)

            if isinstance(decisions_data, list):
                # If it's a list of decisions
                for item in decisions_data:
                    if isinstance(item, dict):
                        decisions.append({
                            'decision': item.get('decision', '') or item.get('description', ''),
                            'timestamp': item.get('timestamp', '')
                        })
                    elif isinstance(item, str):
                        # If it's just a string
                        decisions.append({
                            'decision': item,
                            'timestamp': ''
                        })
            elif isinstance(decisions_data, dict):
                # If it's a single decision
                decisions.append({
                    'decision': decisions_data.get('decision', '') or decisions_data.get('description', ''),
                    'timestamp': decisions_data.get('timestamp', '')
                })

            logger.info(f"Parsed {len(decisions)} decisions from JSON")
            return decisions
        except Exception as e:
            logger.error(f"Error parsing decisions JSON: {str(e)}")
            return []

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
