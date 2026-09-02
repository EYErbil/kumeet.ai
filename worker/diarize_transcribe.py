import os
import json
import csv
import uuid
import torch
from faster_whisper import WhisperModel
from pyannote.audio import Pipeline

from config import (
    HF_TOKEN,
    MIN_DURATION, GAP_THRESHOLD, WHISPER_MODEL,
    USE_GPU
)
from db import save_transcript_in_db


def get_whisper_model_name(quality_setting="normal", language=None):
    """
    Dynamically select the Whisper model based on quality settings and language.
    quality_setting can be: "normal", "better", "best"
    language should be a 2-letter ISO code (e.g., "en", "tr")
    """
    # Map language codes to English variants
    english_codes = {"en", "eng", "english"}
    is_english = language and language.lower() in english_codes

    if quality_setting == "normal":
        # For normal quality, use base model
        return "base.en" if is_english else "base"
    elif quality_setting == "better":
        # For better quality, use large model
        return "base.en" if is_english else "base"
    else:  # best
        # For best quality, use turbo model (no language-specific version)
        return "turbo"


def single_pass_whisper(audio_file, quality_setting="normal", language=None):
    """
    Do a single-pass Whisper transcription using faster-whisper,
    returning a structure like:
      {
        "segments": [
          {"id": 0, "start":..., "end":..., "text":...}, ...
        ],
        ...
      }
    """
    # Get the appropriate model name based on settings
    whisper_model_name = get_whisper_model_name(quality_setting, language)

    # Initialize faster-whisper model
    model = WhisperModel(
        whisper_model_name,
        device="cuda" if USE_GPU else "cpu",
        compute_type="float16" if USE_GPU else "int8"
    )

    # Transcribe with faster-whisper
    segments, info = model.transcribe(
        audio_file,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500)
    )

    # Convert segments to the expected format
    result = {
        "segments": [
            {
                "id": i,
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            }
            for i, segment in enumerate(segments)
        ],
        "language": info.language,  # This will be a 2-letter code like "en", "tr"
        "language_probability": info.language_probability
    }

    return result


def pyannote_diarize(audio_file, hf_token=HF_TOKEN, use_gpu=True):
    """
    One-pass diarization, returning a pyannote Annotation object.
    """
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=hf_token
    )
    if use_gpu:
        pipeline.to(torch.device("cuda"))
    diarization_result = pipeline(audio_file)
    return diarization_result


def merge_close_segments(segments, max_gap=GAP_THRESHOLD):
    """
    Merge segments from the same speaker if they're within max_gap seconds of each other,
    but ONLY if there are no other speakers between them.
    """
    if not segments:
        return segments

    # Sort segments by start time
    sorted_segments = sorted(segments, key=lambda x: x["start"])
    merged = []
    i = 0

    while i < len(sorted_segments):
        current = sorted_segments[i]
        j = i + 1

        # Look ahead to find segments from same speaker within max_gap
        while j < len(sorted_segments):
            next_seg = sorted_segments[j]

            # Check if there are any other speakers between current and next_seg
            has_other_speaker = False
            for k in range(i + 1, j):
                if sorted_segments[k]["speaker"] != current["speaker"]:
                    has_other_speaker = True
                    break

            # Only merge if:
            # 1. Same speaker
            # 2. Within max_gap
            # 3. No other speakers between them
            if (next_seg["speaker"] == current["speaker"] and
                    next_seg["start"] - current["end"] <= max_gap and
                    not has_other_speaker):
                # Merge the segments
                current["end"] = next_seg["end"]
                current["text"] = current["text"] + " " + next_seg["text"]
                j += 1
            else:
                break

        merged.append(current)
        i = j

    return merged


def combine_whisper_and_diarization(whisper_segments, diarization_annotation, min_duration=1.0):
    """
    For each whisper segment [start, end, text],
    we see which speaker intervals from diarization overlap.

    If multiple speaker segments overlap, we subdivide the whisper text
    according to speaker changes. However, note that we do NOT do word-level alignment.
    We simply chunk the whisper segment along the boundaries from pyannote if there's a speaker change.

    This yields a final list of dicts:
      [{"speaker":..., "start":..., "end":..., "text":...}, ...]
    """
    final_segments = []

    # 1) Convert pyannote annotation into a sorted list of speaker segments
    speaker_segments = []
    for turn, _, speaker_label in diarization_annotation.itertracks(yield_label=True):
        speaker_segments.append({
            "speaker": speaker_label,
            "start": turn.start,
            "end": turn.end
        })
    speaker_segments.sort(key=lambda x: x["start"])

    # 2) For each whisper segment, see how it intersects with speaker_segments
    spk_idx = 0
    n_spk = len(speaker_segments)

    for wseg in whisper_segments:
        wstart = wseg["start"]
        wend = wseg["end"]
        wtext = wseg["text"].strip()  # Remove leading/trailing whitespace

        # Find all speaker segments that overlap with this whisper segment
        overlapping_speakers = []
        check_idx = spk_idx

        while check_idx < n_spk and speaker_segments[check_idx]["end"] < wstart:
            check_idx += 1

        while check_idx < n_spk and speaker_segments[check_idx]["start"] < wend:
            spk_seg = speaker_segments[check_idx]
            seg_start = max(wstart, spk_seg["start"])
            seg_end = min(wend, spk_seg["end"])

            if seg_end - seg_start > 0:
                # Calculate the duration of this speaker's segment
                duration = seg_end - seg_start
                # Calculate the proportion of the whisper segment this speaker covers
                proportion = duration / (wend - wstart)

                # Only add if this speaker has a significant portion of the segment
                if proportion > 0.3:  # At least 30% of the segment
                    overlapping_speakers.append({
                        "speaker": spk_seg["speaker"],
                        "start": seg_start,
                        "end": seg_end,
                        "proportion": proportion
                    })
            check_idx += 1

        # If we found overlapping speakers, create segments for each
        if overlapping_speakers:
            # Sort by proportion (highest first) to prioritize the main speaker
            overlapping_speakers.sort(key=lambda x: x["proportion"], reverse=True)

            # Only use the speaker with the highest proportion
            main_speaker = overlapping_speakers[0]
            final_segments.append({
                "speaker": main_speaker["speaker"],
                "start": main_speaker["start"],
                "end": main_speaker["end"],
                "text": wtext
            })

    # filter out sub-segments that are < min_duration if you want
    filtered_final = []
    for seg in final_segments:
        dur = seg["end"] - seg["start"]
        if dur >= min_duration:
            filtered_final.append(seg)

    # sort by start
    filtered_final.sort(key=lambda x: x["start"])

    # Merge close segments from the same speaker
    merged_final = merge_close_segments(filtered_final)

    return merged_final


def diarize_and_transcribe(audio_file, output_dir, session_id=None, quality_setting="normal"):
    """
    1) Single-pass diarization (pyannote)
    2) Single-pass whisper (like 'whisper test.wav')
    3) Combine them => final segments with speaker labels, timestamps, text
    4) Save to DB & local CSV/JSON
    """
    if session_id is None:
        session_id = str(uuid.uuid4())

    # 1) Diarize
    diar_annotation = pyannote_diarize(audio_file, hf_token=HF_TOKEN, use_gpu=USE_GPU)

    # 2) Single-pass whisper
    whisper_result = single_pass_whisper(audio_file, quality_setting=quality_setting)

    # 3) Combine => final_data
    final_data = combine_whisper_and_diarization(
        whisper_result["segments"],
        diar_annotation,
        min_duration=MIN_DURATION
    )

    # 4) Save to DB + local
    from db import save_transcript_in_db
    save_transcript_in_db(session_id, final_data)
    save_transcript_local(final_data, output_dir)

    return final_data, session_id


def save_transcript_local(transcript, output_dir):
    # JSON
    import json
    json_path = os.path.join(output_dir, "transcript.json")
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(transcript, jf, ensure_ascii=False, indent=2)

    # CSV
    import csv
    csv_path = os.path.join(output_dir, "transcript.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as cf:
        fields = ["speaker", "start", "end", "text"]
        writer = csv.DictWriter(cf, fieldnames=fields)
        writer.writeheader()
        writer.writerows(transcript)

    print(f"Transcript saved to {json_path} / {csv_path}")