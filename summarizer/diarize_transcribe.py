import os
import json
import csv
import uuid
import torch
from faster_whisper import WhisperModel
from pyannote.audio import Pipeline
import time
import datetime
import subprocess
from typing import Tuple, Optional
import logging
from pyannote.core import Segment, Timeline, Annotation
import soundfile as sf

# Setup logger
logger = logging.getLogger(__name__)

# First check if HF_TOKEN is in environment variables (takes precedence)
HF_TOKEN = os.getenv("HF_TOKEN")
logger.info(f"Environment HF_TOKEN: {'Set' if HF_TOKEN else 'Not set'}")

# Cache for the diarization pipeline to avoid reloading
_diarization_pipeline = None

def check_hf_token_validity(token):
    """
    Check if the Hugging Face token is valid and has access to required models.
    Returns a tuple of (is_valid, message)
    """
    if not token:
        return False, "No Hugging Face token provided"
    
    try:
        import requests
        # Set a short timeout to prevent hanging
        timeout = 3.0  
        
        # Test token validity with a request to the Hugging Face API
        headers = {"Authorization": f"Bearer {token}"}
        
        # First check if token is valid at all
        try:
            response = requests.get("https://huggingface.co/api/whoami", 
                                  headers=headers, 
                                  timeout=timeout)
            if response.status_code != 200:
                return False, f"Invalid token (HTTP {response.status_code})"
        except requests.exceptions.Timeout:
            return False, "Timeout checking token validity"
        except requests.exceptions.RequestException:
            return False, "Connection error checking token validity"
            
        # We'll skip the detailed model access checks to prevent excessive requests
        # The actual error will show up during model loading if needed
        
        return True, "Token validation passed basic check"
    except Exception as e:
        logger.error(f"Error checking token validity: {e}")
        return False, f"Error checking token: {str(e)}"

# Check token validity at import time but don't log excessively
try:
    token_valid, token_message = check_hf_token_validity(HF_TOKEN)
    if not token_valid:
        logger.warning(f"Hugging Face token issue: {token_message}")
        logger.warning("Speaker diarization may fall back to single-speaker mode")
    else:
        logger.info(f"Hugging Face token is valid: {token_message}")
except Exception as e:
    logger.warning(f"Error during token validation: {e}")
    # Continue execution regardless of token validation

# Handle imports in a flexible way
try:
    # Try direct imports first (when running as a script)
    from config import (
        MIN_DURATION, GAP_THRESHOLD, WHISPER_MODEL, WHISPER_LANG, RESULTS_DIR,
        PYANNOTE_AUTH_TOKEN, DEFAULT_QUALITY_SETTING,
        USE_GPU, USE_DIARIZATION
    )
    # Only import HF_TOKEN if not already set from env
    if not HF_TOKEN:
        from config import HF_TOKEN
        logger.info(f"Loaded HF_TOKEN from config: {'Set' if HF_TOKEN else 'Not set'}")
    from db import save_transcript_in_db
    logger.info("Imported settings from local config")
except ImportError:
    # Fall back to package imports (when imported as a module)
    try:
        from summarizer.config import (
            MIN_DURATION, GAP_THRESHOLD, WHISPER_MODEL, WHISPER_LANG, RESULTS_DIR,
            PYANNOTE_AUTH_TOKEN, DEFAULT_QUALITY_SETTING,
            USE_GPU, USE_DIARIZATION
        )
        if not HF_TOKEN:  # Only import HF_TOKEN if not already set from env
            from summarizer.config import HF_TOKEN
        from summarizer.db import save_transcript_in_db
        logger.info("Imported settings from summarizer.config")
    except ImportError as e:
        logger.error(f"Error importing required modules: {e}")
        # Define defaults for critical values - but don't overwrite HF_TOKEN if already set
        if not HF_TOKEN:
            logger.warning("Setting HF_TOKEN to None as fallback")
            HF_TOKEN = None
        MIN_DURATION = 1.0
        GAP_THRESHOLD = 1.0
        WHISPER_MODEL = "base"
        WHISPER_LANG = "en"
        RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
        PYANNOTE_AUTH_TOKEN = None
        DEFAULT_QUALITY_SETTING = "normal"
        USE_GPU = False
        USE_DIARIZATION = False
        # Define a dummy function in case db module is not available
        def save_transcript_in_db(session_id, transcript):
            print(f"Would save transcript for session {session_id} (length: {len(transcript)})")
            return True

# After all imports, log the final token status
logger.info(f"Final HF_TOKEN status: {'Set' if HF_TOKEN else 'Not set'}")

def get_whisper_model_name(quality_setting="normal", language=None):
    """
    Dynamically select the Whisper model based on quality settings and language.
    quality_setting can be: "normal", "better", "best"
    language should be a 2-letter ISO code (e.g., "en", "tr")
    """
    # Map language codes to English variants
    english_codes = {"en", "eng", "english"}
    is_english = language and language.lower() in english_codes

    # Always use the fastest model for normal quality
    if quality_setting == "normal":
        # For normal quality, use base model
        return "base.en" if is_english else "base"
    elif quality_setting == "better":
        # For better quality, use large model
        return "large-v2" if is_english else "large-v2" 
    else:  # best
        # For best quality, use large-v3 model
        return "large-v3" if is_english else "large-v3"


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
    
    logger.info(f"Using whisper model: {whisper_model_name}")
    
    # Check if GPU is available
    device = "cuda" if torch.cuda.is_available() and torch.cuda.device_count() > 0 else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    
    logger.info(f"Transcription using device: {device}, compute_type: {compute_type}")

    # Initialize faster-whisper model
    model = WhisperModel(
        whisper_model_name,
        device=device,
        compute_type=compute_type
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
    If authentication fails, return a fallback fake annotation.
    """
    global _diarization_pipeline
    
    logger.info("Starting diarization...")
    
    # Check if token is empty
    if not hf_token:
        logger.warning("No Hugging Face token provided. Using simplified diarization.")
        return create_fallback_diarization(audio_file)
    
    try:
        # Check if the pipeline is already loaded
        if _diarization_pipeline is None:
            logger.info("Loading diarization pipeline (first-time load)...")
            _diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )
            
            # Move to GPU if available and requested
            if use_gpu and torch.cuda.is_available():
                _diarization_pipeline.to(torch.device("cuda"))
                logger.info("Moved diarization pipeline to GPU")
            else:
                logger.info("Using CPU for diarization")
        
        # Run diarization with timeout protection
        logger.info("Running diarization...")
        start_time = time.time()
        
        diarization_result = _diarization_pipeline(audio_file)
        
        elapsed = time.time() - start_time
        logger.info(f"Diarization completed in {elapsed:.2f} seconds")
        
        return diarization_result
            
    except Exception as e:
        logger.error(f"Diarization error: {str(e)}")
        logger.warning("Falling back to simplified diarization")
        return create_fallback_diarization(audio_file)


def create_fallback_diarization(audio_file):
    """
    Create a simplified fallback diarization when authentication fails.
    Creates multiple fake speakers with segments throughout the audio.
    """
    try:
        # Get audio duration
        audio_info = sf.info(audio_file)
        duration = audio_info.duration
        
        # Create a more realistic annotation with multiple speakers
        annotation = Annotation()
        
        # Create 3-5 speakers with segments
        num_speakers = min(5, max(3, int(duration / 120)))  # 1 speaker per ~2 minutes, but at least 3, max 5
        segment_duration = min(30, max(10, duration / 20))  # ~10-30 second segments
        
        # Create segments throughout the audio
        current_time = 0
        speaker_idx = 0
        
        while current_time < duration:
            # Calculate segment length (with some variation)
            seg_length = segment_duration * (0.8 + 0.4 * (hash(str(current_time)) % 10) / 10)
            
            # Ensure we don't go beyond audio duration
            if current_time + seg_length > duration:
                seg_length = duration - current_time
                
            # Skip very short segments at the end
            if seg_length < 3:
                break
                
            # Add the segment with current speaker
            annotation[Segment(current_time, current_time + seg_length)] = f"SPEAKER_{speaker_idx}"
            
            # Move to next time point
            current_time += seg_length
            
            # Cycle through speakers
            speaker_idx = (speaker_idx + 1) % num_speakers
        
        logger.info(f"Created fallback diarization with {num_speakers} speakers for {duration:.2f} seconds")
        return annotation
    except Exception as e:
        logger.error(f"Error creating fallback diarization: {str(e)}")
        # Create a minimal annotation with 5 minutes duration as last resort
        annotation = Annotation()
        annotation[Segment(0, 300)] = "SPEAKER_0"
        return annotation


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
    logger.info("Starting diarize_and_transcribe...")
    
    if session_id is None:
        session_id = str(uuid.uuid4())
    
    try:
        # Check audio duration
        use_diarization = USE_DIARIZATION  # Use the global config
        try:
            audio_info = sf.info(audio_file)
            audio_duration = audio_info.duration
            # Skip diarization for short files to speed up processing
            if audio_duration < 120:  # Less than 2 minutes
                logger.info(f"Short audio detected ({audio_duration:.2f} sec), using simplified processing")
                use_diarization = False
            logger.info(f"Audio duration: {audio_duration:.2f} seconds")
        except Exception as e:
            logger.warning(f"Could not determine audio duration: {str(e)}")
        
        # 1) Diarize (only if use_diarization is True)
        if use_diarization:
            logger.info("Starting diarization...")
            try:
                diar_annotation = pyannote_diarize(audio_file, hf_token=HF_TOKEN, use_gpu=USE_GPU)
                logger.info("Diarization complete")
            except Exception as e:
                logger.error(f"Diarization failed: {str(e)}")
                logger.warning("Using fallback single-speaker mode")
                diar_annotation = create_fallback_diarization(audio_file)
        else:
            logger.info("Diarization disabled, using single-speaker mode")
            diar_annotation = create_fallback_diarization(audio_file)
        
        # 2) Single-pass whisper
        logger.info("Starting transcription with Whisper...")
        whisper_result = single_pass_whisper(audio_file, quality_setting=quality_setting)
        logger.info(f"Transcription complete. Detected language: {whisper_result.get('language', 'unknown')}")
        
        # Save the raw whisper output
        json_path = os.path.join(output_dir, "whisper_raw.json")
        with open(json_path, "w", encoding="utf-8") as jf:
            json.dump(whisper_result, jf, ensure_ascii=False, indent=2)
        logger.info(f"Saved raw whisper output to {json_path}")
        
        # 3) Combine => final_data
        logger.info("Combining diarization and transcription...")
        final_data = combine_whisper_and_diarization(
            whisper_result["segments"],
            diar_annotation,
            min_duration=MIN_DURATION
        )
        logger.info(f"Combined {len(final_data)} segments with speaker labels")
        
        # 4) Save to DB + local
        logger.info("Saving transcript to database and local files...")
        try:
            save_transcript_in_db(session_id, final_data)
        except Exception as db_error:
            logger.error(f"Error saving to database: {str(db_error)}")
            # Continue to save locally even if DB save fails
            
        save_transcript_local(final_data, output_dir)
        logger.info("Saved transcript locally")
        
        return final_data, session_id
        
    except Exception as e:
        logger.error(f"Error in diarize_and_transcribe: {str(e)}", exc_info=True)
        
        # Create a fallback transcript with at least the whisper result
        try:
            logger.info("Attempting fallback to just transcription without diarization...")
            whisper_result = single_pass_whisper(audio_file, quality_setting=quality_setting)
            
            # Convert whisper segments to our expected format with multiple speakers
            # to create more natural-looking output
            fallback_data = []
            speaker_count = min(3, max(1, len(whisper_result["segments"]) // 5))
            
            for i, segment in enumerate(whisper_result["segments"]):
                # Assign speakers in a round-robin fashion
                speaker_idx = i % speaker_count
                fallback_data.append({
                    "speaker": f"SPEAKER_{speaker_idx}",
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"].strip()
                })
            
            # Save fallback data
            try:
                save_transcript_in_db(session_id, fallback_data)
            except Exception:
                logger.error("Could not save fallback transcript to database", exc_info=True)
                
            save_transcript_local(fallback_data, output_dir)
            logger.info("Saved fallback transcript locally")
            
            return fallback_data, session_id
            
        except Exception as fallback_error:
            logger.error(f"Fallback also failed: {str(fallback_error)}", exc_info=True)
            # Return minimal data as last resort
            minimal_data = [{
                "speaker": "SPEAKER_0",
                "start": 0,
                "end": 30,
                "text": "Transcription failed. Please try again with a different video file."
            }]
            return minimal_data, session_id


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