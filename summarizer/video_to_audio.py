# video_to_audio.py

import os
import subprocess
import sys

# Try to import directly first
try:
    from config import RESULTS_DIR
except ImportError:
    # Fall back to using the full path if running directly
    try:
        from summarizer.config import RESULTS_DIR
    except ImportError:
        # Define a default if all else fails
        RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")

def video_to_wav(video_path: str, output_wav_path: str) -> None:
    """
    Extract audio from video -> WAV (16 kHz, mono).
    """
    os.makedirs(os.path.dirname(output_wav_path), exist_ok=True)
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_wav_path
    ]
    print(f"Running ffmpeg command: {' '.join(cmd)}")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    if result.returncode != 0:
        error_message = result.stderr.decode('utf-8', errors='replace')
        print(f"Error converting video to audio: {error_message}")
        raise RuntimeError(f"Failed to convert video to audio: {error_message}")
    else:
        print(f"Successfully converted video to audio: {output_wav_path}")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        video_to_wav(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python video_to_audio.py input_video_path output_wav_path")
