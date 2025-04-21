# main.py

import os
import sys
import shutil
import argparse
import time
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor

# Import from summarizer package explicitly
try:
    from summarizer.config import RESULTS_DIR
    from summarizer.db import init_db
    from summarizer.utils import create_results_subdir
    from summarizer.video_to_audio import video_to_wav
    from summarizer.diarize_transcribe import diarize_and_transcribe
    from summarizer.summarize import summarize_transcript
except ImportError:
    # Fall back to relative imports for when running directly
    from config import RESULTS_DIR
    from db import init_db
    from utils import create_results_subdir
    from video_to_audio import video_to_wav
    from diarize_transcribe import diarize_and_transcribe
    from summarize import summarize_transcript

# Setup logger
logger = logging.getLogger(__name__)

def process_pipeline(input_file, quality='normal', meeting_type=None, min_importance=6, focus_question=None):
    """Main processing pipeline for audio/video files"""
    pipeline_start = time.time()
    
    base_name = os.path.basename(input_file)
    ext = os.path.splitext(base_name)[1].lower()

    # create subdir
    out_dir = create_results_subdir(base_name)
    logger.info(f"Created output directory: {out_dir}")

    # convert or copy to audio.wav
    audio_wav = os.path.join(out_dir, "audio.wav")
    if ext in [".mp4", ".mov", ".mkv", ".avi"]:
        logger.info("Converting video -> audio...")
        video_to_wav(input_file, audio_wav)
    else:
        logger.info("Copying audio to subdir...")
        shutil.copy(input_file, audio_wav)

    # diarize & transcribe
    logger.info(f"Diarizing & transcribing with {quality} quality...")
    diarize_start = time.time()
    final_transcript, session_id = diarize_and_transcribe(audio_wav, out_dir, quality_setting=quality)
    diarize_time = time.time() - diarize_start
    logger.info(f"Diarization & transcription completed in {diarize_time:.2f} seconds")
    logger.info(f"Session ID: {session_id}")

    # Build summary message
    summary_msg = f"Summarizing transcript with min importance score of {min_importance}"
    if focus_question:
        summary_msg += f", focusing on: '{focus_question}'"
    logger.info(summary_msg)
    
    # summarize (with gemini + item extraction)
    summarize_start = time.time()
    final_sum = summarize_transcript(
        session_id, 
        out_dir, 
        meeting_type=meeting_type,
        min_importance=min_importance,
        focus_question=focus_question
    )
    summarize_time = time.time() - summarize_start
    
    pipeline_time = time.time() - pipeline_start
    logger.info(f"Summarization completed in {summarize_time:.2f} seconds")
    logger.info(f"Total pipeline processing time: {pipeline_time:.2f} seconds")
    
    if final_sum:
        # Only print the Final Summary section to avoid overwhelming the console
        if "# FINAL SUMMARY" in final_sum:
            # Extract just the final summary section (not the detailed part)
            summary_section = final_sum.split("===")[0].strip()
            logger.info("\n=== FINAL SUMMARY ===\n" + summary_section)
        else:
            logger.info("\n=== FINAL SUMMARY ===\n" + final_sum)
    else:
        logger.error(f"No transcript found in DB for session_id: {session_id}")

    logger.info(f"Check the folder for final outputs: {out_dir}")
    
    # Return results for further processing if needed
    return {
        "session_id": session_id,
        "output_dir": out_dir,
        "summary_available": bool(final_sum),
        "transcript_available": bool(final_transcript),
        "processing_time": pipeline_time,
        "diarization_time": diarize_time,
        "summarization_time": summarize_time,
    }

def main():
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    
    # Initialize the database
    init_db()

    # Set up argument parser
    parser = argparse.ArgumentParser(description='Transcribe and summarize audio/video files')
    parser.add_argument('input_file', help='Input audio or video file')
    parser.add_argument('--quality', choices=['normal', 'better', 'best'], 
                       default='normal', help='Transcription quality (default: normal)')
    parser.add_argument('--meeting-type', default=None, 
                       help='Type of meeting for context (e.g., "team planning", "interview", "presentation")')
    parser.add_argument('--min-importance', type=int, default=6, choices=range(1, 11),
                       help='Minimum importance score (1-10) for points in final summary (default: 6)')
    parser.add_argument('--focus-question', 
                       help='Specific question or topic to focus on in the summary (e.g., "What decisions were made?")')
    args = parser.parse_args()

    # Create the results directory if it doesn't exist
    os.makedirs(RESULTS_DIR, exist_ok=True)
    
    # Run the pipeline
    process_pipeline(
        args.input_file,
        quality=args.quality,
        meeting_type=args.meeting_type,
        min_importance=args.min_importance,
        focus_question=args.focus_question
    )

if __name__ == "__main__":
    main()