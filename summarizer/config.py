# config.py

import os

########################################
# HUGGING FACE
########################################
# You need to create a Hugging Face account, generate a token at https://huggingface.co/settings/tokens
# and accept the license for models like pyannote/speaker-diarization-3.1 at https://huggingface.co/pyannote/speaker-diarization-3.1
HF_TOKEN = os.getenv("HF_TOKEN", "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")  # Set your token as environment variable or paste it here

# Add a warning if using default token (likely invalid)
if HF_TOKEN == "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":
    print("⚠️ WARNING: Using default Hugging Face token which may be invalid.")
    print("  Speaker diarization may not work properly.")
    print("  Please set a valid token in the environment variable HF_TOKEN")
    print("  or update the token directly in summarizer/config.py")
    print("  You can create a token at https://huggingface.co/settings/tokens")
    print("  You also need to accept the license at https://huggingface.co/pyannote/speaker-diarization-3.1")
    
# Disable diarization by default if token is default
USE_DIARIZATION = os.getenv("USE_DIARIZATION", "true" if HF_TOKEN != "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" else "false").lower() in ("true", "1", "t")

HF_SUMMARY_MODEL = "philschmid/bart-large-cnn-samsum"

########################################
# GOOGLE GENAI (gemini)
########################################
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBcizqje0iym5bPHx-OoepPbGqGcuLADKM")

########################################
# DIRECTORY / FILE SETTINGS
########################################
RESULTS_DIR = os.getenv("RESULTS_DIR", "results")   # We'll create a subdir in here for each upload

########################################
# DIARIZATION & TRANSCRIPTION
########################################
MIN_DURATION   = 0.5
GAP_THRESHOLD  = 4.0
WHISPER_MODEL  = os.getenv("WHISPER_MODEL", "normal")  # Can be "normal", "better", or "best"
WHISPER_LANG   = os.getenv("WHISPER_LANG", "en")       # Language code for transcription
USE_GPU        = os.getenv("USE_GPU", "false").lower() in ("true", "1", "t")  # if you have a CUDA device
PYANNOTE_AUTH_TOKEN = os.getenv("PYANNOTE_AUTH_TOKEN", HF_TOKEN)
DEFAULT_QUALITY_SETTING = os.getenv("DEFAULT_QUALITY_SETTING", "normal")

########################################
# DB SETTINGS
########################################
DB_PATH = os.getenv("DB_PATH", "summaries.db")

########################################
# SUMMARIZATION
########################################
MAX_TOKENS_PER_CHUNK = 800  # Set to 800 to leave room for summary within model's 1024 token limit
MEETING_TYPE  = os.getenv("MEETING_TYPE", "generic meeting")
FOCUS_REQUEST = os.getenv("FOCUS_REQUEST", "Focus on tasks, decisions, deadlines.")