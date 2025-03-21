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


def single_pass_whisper(audio_file, whisper_model_name="small"):
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
    # Initialize faster-whisper model
    model = WhisperModel(
        whisper_model_name,
        device="cuda" if USE_GPU else "cpu",
        compute_type="float16" if USE_GPU else "int8"
    )
    
    # Transcribe with faster-whisper
    segments, info = model.transcribe(
        audio_file,
        beam_size=3,
        vad_filter=True,
        vad_parameters=dict(
            min_silence_duration_ms=1000,
            speech_pad_ms=200,
            threshold=0.35
        ),
        condition_on_previous_text=True,
        no_speech_threshold=0.6,
        compression_ratio_threshold=1.2
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
        "language": info.language,
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


def combine_whisper_and_diarization(whisper_segments, diarization_annotation, min_duration=1.0):
    """
    For each whisper segment [start, end, text],
    we see which speaker intervals from diarization overlap.

    If multiple speaker segments overlap, we subdivide the whisper text
    according to speaker changes. However, note that we do NOT do word-level alignment.
    We simply chunk the whisper segment along the boundaries from pyannote if there's a speaker change.

    This yields a final list of dicts:
      [{"speaker":..., "start":..., "end":..., "text":...}, ...]

    We won't lose data, but if there's a speaker change *inside* a single whisper segment,
    we break that segment at the speaker boundary. The text is the same for that subrange.
    It's an approximation, because we can't do partial text alignment without word-level timestamps.
    """
    final_segments = []

    # 1) Convert pyannote annotation into a sorted list of speaker segments
    speaker_segments = []
    # diarization_annotation is an 'Annotation' object. We can iterate over labeled segments:
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
        wtext = wseg["text"]

        # We'll track the position while speaker_segments might shift
        sub_start = wstart
        current_text = wtext

        while spk_idx < n_spk and speaker_segments[spk_idx]["end"] < wstart:
            spk_idx += 1
        # now either spk_idx is at a segment that might overlap

        # we might have multiple speaker segments that overlap [wstart, wend]
        check_idx = spk_idx
        local_pos = wstart

        while check_idx < n_spk and speaker_segments[check_idx]["start"] < wend:
            # find overlap
            spk_seg = speaker_segments[check_idx]
            seg_speaker = spk_seg["speaker"]
            seg_start = max(wstart, spk_seg["start"])
            seg_end = min(wend, spk_seg["end"])

            overlap_dur = seg_end - seg_start
            if overlap_dur > 0:
                # This chunk belongs to seg_speaker
                # We'll store a sub-range from wtext. We can't do word-level alignment easily,
                # so we just store the entire wtext if there's only 1 overlap.
                # But if there's multiple overlaps, we subdivide. We'll break the text if needed
                # but we can't do partial text alignment. So let's store the same text for each subrange?
                # or store partial text?
                # We'll just store the same text for each subrange if there's multiple speakers.
                # It's an approximation.
                final_segments.append({
                    "speaker": seg_speaker,
                    "start": seg_start,
                    "end": seg_end,
                    "text": wtext
                })
            check_idx += 1

    # filter out sub-segments that are < min_duration if you want
    filtered_final = []
    for seg in final_segments:
        dur = seg["end"] - seg["start"]
        if dur >= min_duration:
            filtered_final.append(seg)

    # sort by start
    filtered_final.sort(key=lambda x: x["start"])
    return filtered_final


def diarize_and_transcribe(audio_file, output_dir, session_id=None):
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
    whisper_result = single_pass_whisper(audio_file, whisper_model_name=WHISPER_MODEL)

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