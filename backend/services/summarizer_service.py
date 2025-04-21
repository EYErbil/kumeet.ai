import os
import sys
import uuid
import logging
import logging.handlers
import subprocess
import time
from typing import Optional, Dict, Any
from datetime import datetime
import threading
from queue import Queue

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

# Make sure the summarizer package is in the Python path
summarizer_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'summarizer')
if summarizer_path not in sys.path:
    sys.path.insert(0, summarizer_path)
    logger.info(f"Added summarizer path to sys.path: {summarizer_path}")

# Import from services directory
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
            
            @staticmethod
            def get_meeting_by_id(meeting_id):
                return {}
                
            @staticmethod
            def update_meeting_transcript_path(meeting_id, path):
                pass
                
            @staticmethod
            def update_meeting_summary_path(meeting_id, path):
                pass
                
            @staticmethod
            def update_meeting_session_id(meeting_id, session_id):
                pass
                
            @staticmethod
            def add_meeting_summary(meeting_id, summary_type, summary_text):
                pass
                
            @staticmethod
            def add_meeting_decision(meeting_id, decision_text):
                pass

# Directly import summarizer modules - don't rely on dynamic imports
try:
    from summarizer.config import RESULTS_DIR 
    from summarizer.utils import create_results_subdir
    from summarizer.main import process_pipeline
    logger.info("Successfully imported summarizer modules")
except ImportError as e:
    logger.error(f"Error importing from summarizer package: {e}")
    
    # Try to dynamically find and import the modules
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("config", os.path.join(summarizer_path, "config.py"))
        config = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(config)
        RESULTS_DIR = config.RESULTS_DIR
        
        spec = importlib.util.spec_from_file_location("utils", os.path.join(summarizer_path, "utils.py"))
        utils = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(utils)
        create_results_subdir = utils.create_results_subdir
        
        spec = importlib.util.spec_from_file_location("main", os.path.join(summarizer_path, "main.py"))
        main = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(main)
        process_pipeline = main.process_pipeline
        
        logger.info("Successfully imported summarizer modules using dynamic import")
    except Exception as dynamic_error:
        logger.error(f"Dynamic import also failed: {dynamic_error}")
        # Define fallback functions
        RESULTS_DIR = "results"
        def create_results_subdir(filename):
            dir_name = os.path.join(RESULTS_DIR, f"fallback_{int(time.time())}")
            os.makedirs(dir_name, exist_ok=True)
            return dir_name
            
        def process_pipeline(input_file, **kwargs):
            logger.error("Using dummy process_pipeline - functionality limited")
            return {
                "session_id": str(uuid.uuid4()),
                "output_dir": create_results_subdir("dummy"),
                "summary_available": False,
                "transcript_available": False,
                "processing_time": 0,
                "diarization_time": 0,
                "summarization_time": 0
            }

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

# Queue for tracking active pipeline processes
active_processes = Queue()

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
        Uses an optimized pipeline for better performance
        
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
        # Run the pipeline asynchronously to avoid blocking the API
        def run_pipeline_async():
            try:
                # Run the optimized pipeline
                result = process_pipeline(
                    video_path,
                    quality=quality,
                    meeting_type=meeting_type,
                    min_importance=min_importance,
                    focus_question=focus_question
                )
                
                session_id = result["session_id"]
                out_dir = result["output_dir"]
                
                # Update meeting with the results in the database
                if result["transcript_available"]:
                    MeetingService.update_meeting_session_id(meeting_id, session_id)
                    
                    # Update meeting with transcript file if available
                    transcript_file = os.path.join(out_dir, "transcript.json")
                    if os.path.exists(transcript_file):
                        MeetingService.update_meeting_transcript_path(meeting_id, transcript_file)
                        
                        # Load transcript data and update transcript segments
                        try:
                            with open(transcript_file, 'r') as f:
                                import json
                                transcript_data = json.load(f)
                                MeetingService.update_meeting_transcript_segments(meeting_id, transcript_data)
                        except Exception as e:
                            logger.error(f"Error loading transcript file: {str(e)}")
                
                if result["summary_available"]:
                    # Update meeting with summary file if available
                    summary_file = os.path.join(out_dir, "summary.txt")
                    if os.path.exists(summary_file):
                        MeetingService.update_meeting_summary_path(meeting_id, summary_file)
                        
                        # Load summary data and update summaries
                        try:
                            with open(summary_file, 'r') as f:
                                summary_text = f.read()
                                
                                # Extract and save overview summary
                                overview = extract_overview_from_summary(summary_text)
                                if overview:
                                    MeetingService.add_meeting_summary(meeting_id, "overview", overview)
                                
                                # Extract and save key points
                                key_points = extract_key_points_from_summary(summary_text)
                                if key_points:
                                    for point in key_points:
                                        MeetingService.add_meeting_decision(meeting_id, point)
                                
                                # Save full summary
                                MeetingService.add_meeting_summary(meeting_id, "detailed", summary_text)
                        except Exception as e:
                            logger.error(f"Error processing summary file: {str(e)}")
                
                logger.info(f"Pipeline processing complete for meeting ID {meeting_id}")
                
            except Exception as e:
                logger.error(f"Error in async pipeline processing: {str(e)}", exc_info=True)
            finally:
                # Remove from active processes queue
                try:
                    active_processes.get_nowait()
                    active_processes.task_done()
                except:
                    pass
        
        try:
            start_time = time.time()
            logger.info(f"Starting video processing for meeting ID: {meeting_id}")
            
            # Create a unique session ID with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            session_id = f"meeting_{meeting_id}_{timestamp}"
            
            # Create output directory
            base_name = os.path.basename(video_path)
            os.makedirs(RESULTS_DIR, exist_ok=True)
            out_dir = create_results_subdir(base_name)
            
            # Add to active processes
            active_processes.put(meeting_id)
            
            # Start processing in a background thread
            thread = threading.Thread(target=run_pipeline_async)
            thread.daemon = True
            thread.start()
            
            # Return immediately with initial information
            return {
                "success": True,
                "session_id": session_id,
                "output_directory": out_dir,
                "message": "Processing started in background",
                "status": "processing",
                "transcript_available": False,
                "summary_available": False
            }
            
        except Exception as e:
            logger.error(f"Error starting video processing: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "status": "failed",
                "transcript_available": False,
                "summary_available": False
            }
    
    @staticmethod
    def get_pipeline_status(meeting_id: int) -> Dict[str, Any]:
        """Check the status of a running pipeline for a meeting"""
        # Check if the meeting is in the active processes queue
        in_progress = False
        queue_size = active_processes.qsize()
        
        # Convert queue to list to check contents (not very efficient, but works for small queues)
        temp_list = []
        for _ in range(queue_size):
            try:
                item = active_processes.get_nowait()
                temp_list.append(item)
                active_processes.task_done()
                if item == meeting_id:
                    in_progress = True
            except:
                break
                
        # Put items back in queue
        for item in temp_list:
            active_processes.put(item)
            
        if in_progress:
            return {
                "status": "processing",
                "message": "Video is still being processed"
            }
        
        # Check if we have results in the database
        try:
            meeting = MeetingService.get_meeting_by_id(meeting_id)
            if meeting and meeting.get("transcript_path") and meeting.get("summary_path"):
                return {
                    "status": "completed",
                    "message": "Processing completed successfully",
                    "transcript_available": True,
                    "summary_available": True
                }
            elif meeting and meeting.get("transcript_path"):
                return {
                    "status": "partial",
                    "message": "Transcript completed but summary not available",
                    "transcript_available": True,
                    "summary_available": False
                }
        except:
            pass
            
        return {
            "status": "unknown",
            "message": "Processing status unknown"
        } 