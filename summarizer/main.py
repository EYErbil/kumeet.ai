# main.py

import os
import sys
import shutil
import argparse

from config import RESULTS_DIR
from db import init_db
from utils import create_results_subdir
from video_to_audio import video_to_wav
from diarize_transcribe import diarize_and_transcribe
from summarize import summarize_transcript

def main():
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

    input_file = args.input_file
    base_name = os.path.basename(input_file)
    ext = os.path.splitext(base_name)[1].lower()

    # create subdir
    out_dir = create_results_subdir(base_name)
    print("Created subdir:", out_dir)

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
    final_transcript, session_id = diarize_and_transcribe(audio_wav, out_dir, quality_setting=args.quality)
    print(f"Session ID: {session_id}")

    # Build summary message
    summary_msg = f"Summarizing transcript, extracting bullet items with min importance score of {args.min_importance}"
    if args.focus_question:
        summary_msg += f", focusing on: '{args.focus_question}'"
    print(summary_msg + "...")
    
    # summarize (with gemini + item extraction)
    final_sum = summarize_transcript(
        session_id, 
        out_dir, 
        meeting_type=args.meeting_type,
        min_importance=args.min_importance,
        focus_question=args.focus_question
    )
    
    if final_sum:
        # Only print the Final Summary section to avoid overwhelming the console
        if "# FINAL SUMMARY" in final_sum:
            # Extract just the final summary section (not the detailed part)
            summary_section = final_sum.split("===")[0].strip()
            print("\n=== FINAL SUMMARY ===\n", summary_section)
        else:
            print("\n=== FINAL SUMMARY ===\n", final_sum)
    else:
        print("No transcript found in DB for session_id:", session_id)

    print("\nCheck the folder for final outputs:", out_dir)

if __name__ == "__main__":
    os.makedirs(RESULTS_DIR, exist_ok=True)
    main()