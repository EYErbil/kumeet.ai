import os
import subprocess
import whisper
import json
import csv
from pyannote.audio import Pipeline
import torch


def diarize_audio(audio_path, hf_token, use_gpu=True):
    """
    Runs pyannote speaker diarization on the given audio and returns
    a sorted list of segments: [{"start": float, "end": float, "speaker": str}, ...]
    """
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=hf_token
    )
    if use_gpu:
        pipeline.to(torch.device("cuda"))

    diarization_result = pipeline(audio_path)
    segments = []
    for turn, _, speaker_label in diarization_result.itertracks(yield_label=True):
        segments.append({
            "start": turn.start,
            "end": turn.end,
            "speaker": speaker_label
        })

    # Sort by start time
    segments.sort(key=lambda x: x["start"])
    return segments


def merge_segments(segments, gap_threshold=1.0):
    """
    Merges consecutive segments from the same speaker if the gap
    between them is <= gap_threshold seconds.
    Returns a new list of merged segments.
    """
    if not segments:
        return []

    merged_segments = []
    current = segments[0]

    for nxt in segments[1:]:
        same_speaker = (nxt["speaker"] == current["speaker"])
        short_gap = (nxt["start"] - current["end"] <= gap_threshold)

        if same_speaker and short_gap:
            # Extend the current segment
            current["end"] = nxt["end"]
        else:
            merged_segments.append(current)
            current = nxt

    # Add the last one
    merged_segments.append(current)
    return merged_segments


def slice_audio(original_wav, output_wav, start_time, end_time):
    """
    Uses ffmpeg to slice 'original_wav' from 'start_time' to 'end_time'
    and saves it as 'output_wav'.
    """
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
    """
    Transcribes the given slice using the specified Whisper model.
    Returns the transcribed text.
    """
    result = whisper_model.transcribe(slice_wav)
    return result["text"]


def main():
    # ----- CUSTOMIZE THESE AS NEEDED -----
    audio_file = "audio.wav"
    hf_token = "hf_YOUR_REAL_TOKEN_HERE"
    min_duration = 2.0  # skip any segment under 2s
    gap_threshold = 1.0  # merge speaker segments if the gap <= 1s
    # -------------------------------------

    # Step 1: Diarize to get raw speaker segments
    segments = diarize_audio(audio_file, hf_token, use_gpu=True)

    # Step 2: Merge small consecutive segments
    merged = merge_segments(segments, gap_threshold=gap_threshold)

    # Step 2a: Filter out any segment under 'min_duration' seconds
    filtered_segments = []
    for seg in merged:
        duration = seg["end"] - seg["start"]
        if duration >= min_duration:
            filtered_segments.append(seg)
        # else skip this short segment

    # Step 3: Load the Whisper model once
    model = whisper.load_model("turbo")  # 'medium', 'large', etc. as you prefer

    # Step 4: Slice & Transcribe
    final_transcript = []
    for idx, seg in enumerate(filtered_segments):
        start = seg["start"]
        end = seg["end"]
        speaker = seg["speaker"]

        slice_wav = f"slice_{idx}_{speaker}.wav"
        slice_audio(audio_file, slice_wav, start, end)

        text = transcribe_segment(slice_wav, model)

        final_transcript.append({
            "speaker": speaker,
            "start": start,
            "end": end,
            "text": text.strip()
        })

    # Step 5: Sort final transcript by start (just in case) & display
    final_transcript.sort(key=lambda x: x["start"])

    for seg in final_transcript:
        print(f"[{seg['start']:.2f}-{seg['end']:.2f}] {seg['speaker']}: {seg['text']}")

    # Step 6: Write to JSON + CSV
    with open("transcript.json", "w", encoding="utf-8") as f:
        json.dump(final_transcript, f, ensure_ascii=False, indent=2)

    with open("transcript.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["speaker", "start", "end", "text"])
        writer.writeheader()
        writer.writerows(final_transcript)

    print("Transcript saved to transcript.json and transcript.csv")


if __name__ == "__main__":
    main()
