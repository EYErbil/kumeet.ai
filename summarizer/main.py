# main.py

import os
import sys
import shutil

from config import RESULTS_DIR
from db import init_db
from utils import create_results_subdir
from video_to_audio import video_to_wav
from diarize_transcribe import diarize_and_transcribe
from summarize import summarize_transcript

def main():
    init_db()

    if len(sys.argv) < 2:
        print("Usage: python main.py <input_file>")
        sys.exit(1)

    input_file = sys.argv[1]
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
    print("Diarizing & transcribing...")
    final_transcript, session_id = diarize_and_transcribe(audio_wav, out_dir)
    print(f"Session ID: {session_id}")

    # summarize (with HF + gemini + item extraction)
    print("Summarizing transcript, extracting bullet items with scores...")
    #final_sum = summarize_transcript(session_id, out_dir)
    #if final_sum:
        #print("\n=== FINAL SUMMARY ===\n", final_sum)
    #else:
        #print("No transcript found in DB for session_id:", session_id)

    print("\nCheck the folder for final outputs:", out_dir)

if __name__ == "__main__":
    os.makedirs(RESULTS_DIR, exist_ok=True)
    main()
