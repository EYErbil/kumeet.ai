# main.py

import os
import sys
import shutil
import argparse

from config import RESULTS_DIR, validate_provider_credentials
from db import init_db
from utils import create_results_subdir
from video_to_audio import video_to_wav
from diarize_transcribe import diarize_and_transcribe
from summarize import summarize_transcript

def main():
    validate_provider_credentials()
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
    parser.add_argument('--session-id', 
                       help='Session ID for tracking (e.g., "meeting_123_20231001123045")')
    args = parser.parse_args()

    input_file = args.input_file
    base_name = os.path.basename(input_file)
    ext = os.path.splitext(base_name)[1].lower()
    
    # Use provided session_id or create one based on the input file
    session_id = args.session_id if args.session_id else None

    # Create output directory
    if session_id:
        # If session_id is provided, create a directory with that name
        out_dir = os.path.join(RESULTS_DIR, session_id)
        os.makedirs(out_dir, exist_ok=True)
        print(f"Created directory for session: {out_dir}")
    else:
        # Otherwise create a directory with a unique name based on the input file
        out_dir = create_results_subdir(base_name)
        print(f"Created subdir: {out_dir}")

    # convert or copy to audio.wav
    audio_wav = os.path.join(out_dir, "audio.wav")
    if ext in [".mp4", ".mov", ".mkv", ".avi"]:
        print("Converting video -> audio...")
        video_to_wav(input_file, audio_wav)
    else:
        print("Copying audio to subdir...")
        shutil.copy(input_file, audio_wav)

    # diarize & transcribe
    print(f"Diarizing & transcribing with {args.quality} quality...")
    final_transcript, session_id = diarize_and_transcribe(audio_wav, out_dir, session_id=session_id, quality_setting=args.quality)
    
    # Then summarize
    print("Generating summary...")
    summary = summarize_transcript(
        session_id, 
        out_dir,
        meeting_type=args.meeting_type,
        min_importance=args.min_importance,
        focus_question=args.focus_question
    )
    
    # Save final output files with the session ID
    summary_txt = os.path.join(out_dir, "summary.txt")
    transcript_json = os.path.join(out_dir, "transcript.json")
    transcript_csv = os.path.join(out_dir, "transcript.csv")
    
    print(f"Processing complete. Results saved to {out_dir}")
    print(f"Session ID: {session_id}")
    
    return {
        "status": "success",
        "session_id": session_id,
        "output_dir": out_dir,
        "summary_file": summary_txt,
        "transcript_file": transcript_csv
    }

if __name__ == "__main__":
    os.makedirs(RESULTS_DIR, exist_ok=True)
    main()
