# video_to_audio.py

import os
import subprocess

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
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == "__main__":
    pass
