# config.py

import os

########################################
# HUGGING FACE
########################################
HF_TOKEN = os.getenv("HF_TOKEN", "hf_your_token_here")
HF_SUMMARY_MODEL = "philschmid/bart-large-cnn-samsum"

########################################
# GOOGLE GENAI (gemini)
########################################
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBcizqje0iym5bPHx-OoepPbGqGcuLADKM")

########################################
# DIRECTORY / FILE SETTINGS
########################################
RESULTS_DIR = "results"   # We'll create a subdir in here for each upload

########################################
# DIARIZATION & TRANSCRIPTION
########################################
MIN_DURATION   = 2.0
GAP_THRESHOLD  = 1.0
WHISPER_MODEL  = "turbo"
USE_GPU        = True  # if you have a CUDA device

########################################
# DB SETTINGS
########################################
DB_PATH = "summaries.db"

########################################
# SUMMARIZATION
########################################
MAX_LINES_PER_CHUNK = 10
MEETING_TYPE  = "generic meeting"
FOCUS_REQUEST = "Focus on tasks, decisions, deadlines."