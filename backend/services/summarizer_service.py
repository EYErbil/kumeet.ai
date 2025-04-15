import os
import sys
import uuid
import logging
import logging.handlers
import subprocess
import time
from typing import Optional, Dict, Any
from datetime import datetime

# Configure logging with rotation to prevent large log files
# Make sure logs directory exists
logs_dir = os.path.join(os.getcwd(), 'logs')
os.makedirs(logs_dir, exist_ok=True)

# Set log level to INFO for important messages only
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        # Use a rotating file handler to limit log file size
        logging.handlers.RotatingFileHandler(
            os.path.join(logs_dir, 'pipeline.log'),
            maxBytes=10*1024*1024,  # 10 MB
            backupCount=3
        ),
        logging.StreamHandler(sys.stdout)
    ]
)

# Reduce logging from requests and urllib3
logging.getLogger('requests').setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)
logging.getLogger('pyannote').setLevel(logging.WARNING)

# Setup logger
logger = logging.getLogger("summarizer_pipeline")

# Determine summarizer path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
summarizer_path = os.path.join(base_dir, 'summarizer')
root_summarizer_path = os.path.join(os.path.dirname(base_dir), 'summarizer')

# Use the root summarizer directory if it exists and is different
if os.path.exists(root_summarizer_path) and os.path.isdir(root_summarizer_path):
    summarizer_path = root_summarizer_path
    logger.info(f"Using root level summarizer at: {summarizer_path}")
else:
    logger.info(f"Using backend level summarizer at: {summarizer_path}")

# Add the selected summarizer directory to Python path
sys.path.insert(0, summarizer_path)

# Log directory paths to help with debugging
logger.info(f"Current working directory: {os.getcwd()}")
logger.info(f"Base directory: {base_dir}")
logger.info(f"Summarizer path: {summarizer_path}")

try:
    # Import from summarizer modules
    from video_to_audio import video_to_wav
    from diarize_transcribe import diarize_and_transcribe
    from summarize import summarize_transcript
    from utils import create_results_subdir
    from config import RESULTS_DIR
    from db import init_db
    
    logger.info("Successfully imported modules directly from summarizer")
    
    # Initialize the summarizer database
    try:
        # Ensure data directory exists
        os.makedirs(os.path.join(summarizer_path, "data"), exist_ok=True)
        init_db()
        logger.info("Summarizer database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize summarizer database: {str(e)}")
except ImportError as e:
    logger.error(f"Failed to import summarizer modules directly: {str(e)}")
    try:
        # Alternative imports with summarizer prefix
        from summarizer.video_to_audio import video_to_wav
        from summarizer.diarize_transcribe import diarize_and_transcribe
        from summarizer.summarize import summarize_transcript
        from summarizer.utils import create_results_subdir
        from summarizer.config import RESULTS_DIR
        from summarizer.db import init_db
        
        logger.info("Successfully imported modules using summarizer package")
        
        # Initialize the database
        os.makedirs("data", exist_ok=True)
        init_db()
        logger.info("Summarizer database initialized using package imports")
    except Exception as inner_e:
        logger.error(f"Failed to import summarizer using alternative method: {str(inner_e)}")
        raise RuntimeError(f"Cannot import summarizer modules: {str(e)} -> {str(inner_e)}")

# After all imports, add import for MeetingService
try:
    from services.meeting_service import MeetingService
    logger.info("Successfully imported MeetingService")
except ImportError:
    try:
        from backend.services.meeting_service import MeetingService
        logger.info("Successfully imported MeetingService from backend.services")
    except ImportError as e:
        logger.error(f"Error importing MeetingService: {str(e)}")
        # Define a dummy MeetingService class for fallback
        class MeetingService:
            @staticmethod
            def update_meeting_transcript_segments(meeting_id, transcript_data):
                logger.warning(f"Would update transcript segments for meeting {meeting_id} (length: {len(transcript_data)})")
                return True

# Helper functions for summary extraction
def extract_overview_from_summary(summary: str) -> str:
    """Extract an overview from the summary text"""
    # Look for the "FINAL SUMMARY" section
    if "# FINAL SUMMARY" in summary:
        # Get the text after the header
        overview_section = summary.split("# FINAL SUMMARY")[1].strip()
        
        # Take the first paragraph as the overview
        paragraphs = overview_section.split("\n\n")
        if paragraphs:
            if "Key points" in paragraphs[0]:
                # Skip the "Key points" heading and take the next paragraph
                return paragraphs[1] if len(paragraphs) > 1 else paragraphs[0]
            return paragraphs[0]
            
    # Fallback - take the first 200 characters
    return summary[:200] + "..."

def extract_key_points_from_summary(summary: str) -> list:
    """Extract key points from the summary text"""
    key_points = []
    
    # Look for bullet points in the Key points section
    if "Key points" in summary:
        lines = summary.split("\n")
        for line in lines:
            # Look for lines that start with bullet points or numbers
            if line.strip().startswith(("-", "*", "•")) or (line.strip() and line.strip()[0].isdigit() and ". " in line):
                # Remove the bullet point or number and extract the text
                point_text = line.strip()
                for prefix in ["-", "*", "•"]:
                    if point_text.startswith(prefix):
                        point_text = point_text[len(prefix):].strip()
                        break
                
                # If it's a numbered point, remove the number
                if point_text and point_text[0].isdigit() and ". " in point_text:
                    point_text = point_text.split(". ", 1)[1].strip()
                
                # Remove timestamp if present
                if "[timestamp:" in point_text:
                    point_text = point_text.split("[timestamp:", 1)[0].strip()
                
                if point_text:
                    key_points.append(point_text)
    
    return key_points

class SummarizerService:
    @staticmethod
    def process_video(
        video_path: str,
        meeting_id: int,
        meeting_type: Optional[str] = None,
        quality: str = "normal",
        min_importance: int = 6,
        focus_question: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a video file through the summarization pipeline
        
        Args:
            video_path: Path to the uploaded video file
            meeting_id: ID of the meeting in the database
            meeting_type: Type of meeting for context
            quality: Transcription quality ('normal', 'better', 'best')
            min_importance: Minimum importance score for points in final summary
            focus_question: Specific question to focus on
            
        Returns:
            Dict containing processing results including session_id and output directory
        """
        try:
            start_time = time.time()
            logger.info(f"Starting video processing for meeting ID: {meeting_id}")
            logger.info(f"Video path: {video_path}")
            logger.info(f"Meeting type: {meeting_type}")
            logger.info(f"Quality setting: {quality}")
            logger.info(f"Min importance: {min_importance}")
            
            # Create a unique session ID with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            session_id = f"meeting_{meeting_id}_{timestamp}"
            
            # Create output directory
            base_name = os.path.basename(video_path)
            os.makedirs(RESULTS_DIR, exist_ok=True)
            out_dir = create_results_subdir(base_name)
            logger.info(f"Created output directory: {out_dir}")
            
            # Result tracking 
            final_transcript = None
            transcript_file = None
            final_summary = None
            summary_file = None
            has_error = False
            error_message = None
            
            # Start the pipeline process
            logger.info("PIPELINE STEP 1: Converting video to audio...")
            audio_wav = os.path.join(out_dir, "audio.wav")
            try:
                video_to_wav(video_path, audio_wav)
                logger.info(f"Video converted to audio: {audio_wav}")
            except Exception as e:
                logger.error(f"Error converting video to audio: {str(e)}", exc_info=True)
                has_error = True
                error_message = f"Audio conversion failed: {str(e)}"
                # Cannot proceed without audio
                return {
                    "success": False,
                    "error": error_message,
                    "session_id": session_id,
                    "output_directory": out_dir
                }
            
            # Diarize and transcribe
            logger.info(f"PIPELINE STEP 2: Diarizing & transcribing with {quality} quality...")
            try:
                final_transcript, transcript_session_id = diarize_and_transcribe(
                    audio_wav, out_dir, quality_setting=quality
                )
                
                # Use the session ID from diarize_and_transcribe if it's provided
                if transcript_session_id:
                    session_id = transcript_session_id
                    
                logger.info(f"Transcript completed with session ID: {session_id}")
                logger.info(f"Transcript length: {len(final_transcript) if final_transcript else 0} segments")
                
                # Save the transcript to a file for inspection
                transcript_file = os.path.join(out_dir, "transcript.txt")
                with open(transcript_file, 'w') as f:
                    if final_transcript:
                        f.write("\n".join([f"[{segment['speaker']}] ({segment['start']:.2f}-{segment['end']:.2f}): {segment['text']}" 
                                          for segment in final_transcript]))
                    else:
                        f.write("No transcript generated")
                        
                # Save transcript segments to PostgreSQL database for the meeting
                if final_transcript and meeting_id:
                    try:
                        logger.info(f"Updating transcript segments for meeting {meeting_id}")
                        success = MeetingService.update_meeting_transcript_segments(meeting_id, final_transcript)
                        if success:
                            logger.info(f"Successfully updated {len(final_transcript)} transcript segments in PostgreSQL")
                        else:
                            logger.error("Failed to update transcript segments in PostgreSQL")
                    except Exception as db_error:
                        logger.error(f"Error updating transcript segments in PostgreSQL: {str(db_error)}", exc_info=True)
            except Exception as e:
                logger.error(f"Error in transcription step: {str(e)}", exc_info=True)
                has_error = True
                error_message = f"Transcription failed: {str(e)}"
                transcript_file = os.path.join(out_dir, "transcript_error.txt")
                with open(transcript_file, 'w') as f:
                    f.write(f"Transcription error: {str(e)}\n")
                # Create empty transcript to allow summarization to be attempted
                final_transcript = []
            
            # Summarize transcript - only if we have a transcript
            if final_transcript:
                logger.info(f"PIPELINE STEP 3: Summarizing transcript with min importance {min_importance}...")
                try:
                    final_summary = summarize_transcript(
                        session_id, 
                        out_dir, 
                        meeting_type=meeting_type,
                        min_importance=min_importance,
                        focus_question=focus_question
                    )
                    
                    # Save the summary to a file for inspection
                    summary_file = os.path.join(out_dir, "summary.txt")
                    with open(summary_file, 'w') as f:
                        f.write(final_summary if final_summary else "No summary generated")
                        
                    logger.info(f"Summary completed and saved to: {summary_file}")
                    
                    # Save summary to PostgreSQL database for the meeting
                    if final_summary and meeting_id:
                        try:
                            logger.info(f"Updating meeting summaries for meeting {meeting_id}")
                            
                            # Extract and save overview summary
                            try:
                                overview = extract_overview_from_summary(final_summary)
                                if overview:
                                    success = MeetingService.add_meeting_summary(
                                        meeting_id, 
                                        "overview", 
                                        overview
                                    )
                                    if success:
                                        logger.info(f"Successfully saved overview summary to PostgreSQL")
                                    else:
                                        logger.error("Failed to save overview summary to PostgreSQL")
                            except Exception as overview_error:
                                logger.error(f"Error extracting overview: {str(overview_error)}", exc_info=True)
                                
                            # Extract and save key points
                            try:
                                key_points = extract_key_points_from_summary(final_summary)
                                if key_points:
                                    for point in key_points:
                                        MeetingService.add_meeting_decision(
                                            meeting_id, 
                                            point
                                        )
                                    logger.info(f"Successfully saved {len(key_points)} key points to PostgreSQL")
                            except Exception as key_points_error:
                                logger.error(f"Error extracting key points: {str(key_points_error)}", exc_info=True)
                                
                            # Save full summary
                            success = MeetingService.add_meeting_summary(
                                meeting_id, 
                                "detailed", 
                                final_summary
                            )
                            if success:
                                logger.info(f"Successfully saved detailed summary to PostgreSQL")
                            else:
                                logger.error("Failed to save detailed summary to PostgreSQL")
                                
                        except Exception as db_error:
                            logger.error(f"Error updating summaries in PostgreSQL: {str(db_error)}", exc_info=True)
                except Exception as e:
                    logger.error(f"Error in summarization step: {str(e)}", exc_info=True)
                    has_error = True
                    error_message = f"Summarization failed: {str(e)}"
                    summary_file = os.path.join(out_dir, "summary_error.txt")
                    with open(summary_file, 'w') as f:
                        f.write(f"Summarization error: {str(e)}\n")
            else:
                logger.warning("Skipping summarization step as no transcript was generated")
                
            # Calculate processing time
            elapsed_time = time.time() - start_time
            logger.info(f"Total pipeline processing time: {elapsed_time:.2f} seconds")
            
            return {
                "success": not has_error,
                "partial_success": has_error and (final_transcript or final_summary),
                "error": error_message,
                "session_id": session_id,
                "output_directory": out_dir,
                "transcript_file": transcript_file,
                "summary_file": summary_file,
                "transcript_available": bool(final_transcript),
                "summary_available": bool(final_summary),
                "processing_time": f"{elapsed_time:.2f} seconds",
                "has_diarization": not has_error or "diarization failed" not in (error_message or ""),
                "warning": "Using fallback single-speaker mode due to Hugging Face authentication issues" 
                          if has_error and "Unauthorized" in (error_message or "") else None
            }
        
        except Exception as e:
            logger.error(f"Error processing video: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            } 