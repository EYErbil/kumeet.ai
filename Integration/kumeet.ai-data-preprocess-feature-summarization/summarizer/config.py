# config.py

import os

########################################
# HUGGING FACE
########################################
HF_TOKEN = "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"  # Hardcoded token for pyannote/speaker-diarization
HF_SUMMARY_MODEL = "philschmid/bart-large-cnn-samsum"

########################################
# GOOGLE GENAI (gemini)
########################################
GEMINI_API_KEY = "AIzaSyBcizqje0iym5bPHx-OoepPbGqGcuLADKM"

########################################
# DIRECTORY / FILE SETTINGS
########################################
RESULTS_DIR = "/app/shared_data/results"   # We'll create a subdir in here for each upload

########################################
# DIARIZATION & TRANSCRIPTION
########################################
MIN_DURATION   = 0.5
GAP_THRESHOLD  = 4.0
WHISPER_MODEL  = "normal"  # Can be "normal", "better", or "best"
USE_GPU        = True  # if you have a CUDA device

########################################
# DB SETTINGS
########################################
DB_PATH = "summaries.db"

########################################
# SUMMARIZATION
########################################
MAX_TOKENS_PER_CHUNK = 800  # Set to 800 to leave room for summary within model's 1024 token limit
MEETING_TYPE  = "generic meeting"
FOCUS_REQUEST = "Focus on tasks, decisions, deadlines."