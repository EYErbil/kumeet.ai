# diarize_transcribe.py

import os
import json
import csv
import subprocess
import torch
import whisper
import uuid

from pyannote.audio import Pipeline

from config import (
    HF_TOKEN, MIN_DURATION, GAP_THRESHOLD, WHISPER_MODEL,
    USE_GPU
)
from db import save_transcript_in_db

def diarize_audio(audio_path):
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=HF_TOKEN
    )
    if USE_GPU:
        pipeline.to(torch.device("cuda"))

    diarization_result = pipeline(audio_path)
    segments = []
    for turn, _, speaker_label in diarization_result.itertracks(yield_label=True):
        segments.append({
            "start": turn.start,
            "end": turn.end,
            "speaker": speaker_label
        })
    segments.sort(key=lambda x: x["start"])
    return segments

def merge_segments(segments, gap_threshold=1.0):
    if not segments:
        return []
    merged = []
    current = segments[0]
    for nxt in segments[1:]:
        same_speaker = (nxt["speaker"] == current["speaker"])
        short_gap = (nxt["start"] - current["end"] <= gap_threshold)
        if same_speaker and short_gap:
            current["end"] = nxt["end"]
        else:
            merged.append(current)
            current = nxt
    merged.append(current)
    return merged

def slice_audio(original_wav, output_wav, start_time, end_time):
    duration = end_time - start_time
    cmd = [
        "ffmpeg", "-y",
        "-i", original_wav,
        "-ss", str(start_time),
        "-t", str(duration),
        "-c", "copy",
        output_wav
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def transcribe_segment(slice_wav, whisper_model):
    result = whisper_model.transcribe(slice_wav)
    text = result["text"].strip()
    return text

def diarize_and_transcribe(audio_file, output_dir, session_id=None):
    """
    1) Diarize
    2) Merge
    3) Filter short
    4) ephemeral slice -> transcribe -> remove
    5) Save final transcript (DB + local CSV/JSON)

    Return (final_transcript, session_id).
    """
    if session_id is None:
        session_id = str(uuid.uuid4())

    # diarize
    segs = diarize_audio(audio_file)
    merged = merge_segments(segs, GAP_THRESHOLD)

    # filter short
    filtered = []
    for seg in merged:
        dur = seg["end"] - seg["start"]
        if dur >= MIN_DURATION:
            filtered.append(seg)

    # load whisper
    w_model = whisper.load_model(WHISPER_MODEL)

    final_data = []
    for idx, seg in enumerate(filtered):
        slice_path = os.path.join(output_dir, f"slice_{idx}_{seg['speaker']}.wav")
        slice_audio(audio_file, slice_path, seg["start"], seg["end"])
        text = transcribe_segment(slice_path, w_model)
        final_data.append({
            "speaker": seg["speaker"],
            "start": seg["start"],
            "end": seg["end"],
            "text": text
        })
        # ephemeral delete
        os.remove(slice_path)

    final_data.sort(key=lambda x: x["start"])

    # store in DB
    save_transcript_in_db(session_id, final_data)

    # also local CSV/JSON
    save_transcript_local(final_data, output_dir)

    return final_data, session_id

def save_transcript_local(transcript, output_dir):
    # JSON
    json_path = os.path.join(output_dir, "transcript.json")
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(transcript, jf, ensure_ascii=False, indent=2)

    # CSV
    csv_path = os.path.join(output_dir, "transcript.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as cf:
        fields = ["speaker", "start", "end", "text"]
        writer = csv.DictWriter(cf, fieldnames=fields)
        writer.writeheader()
        writer.writerows(transcript)

    print(f"Transcript saved to {json_path} / {csv_path}")


if __name__ == "__main__":
    pass
