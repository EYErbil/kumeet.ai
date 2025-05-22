
from dotenv import load_dotenv
import os

load_dotenv()

########################################
# HUGGING FACE
########################################
HF_TOKEN = os.getenv("HF_TOKEN", "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")
HF_SUMMARY_MODEL = os.getenv("HF_SUMMARY_MODEL", "philschmid/bart-large-cnn-samsum")

########################################
# GOOGLE GENAI (gemini)
########################################
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBcizqje0iym5bPHx-OoepPbGqGcuLADKM")

########################################
# DIRECTORY / FILE SETTINGS
########################################
RESULTS_DIR = os.getenv("RESULTS_DIR", "/app/shared_data/results")

########################################
# DIARIZATION & TRANSCRIPTION
########################################
MIN_DURATION = float(os.getenv("MIN_DURATION", 0.5))
GAP_THRESHOLD = float(os.getenv("GAP_THRESHOLD", 4.0))
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "normal")
USE_GPU = os.getenv("USE_GPU", "false").lower() == "true"  # Converts string to bool

########################################
# DB SETTINGS
########################################
DB_PATH = os.getenv("DB_PATH", "summaries.db")

########################################
# SUMMARIZATION
########################################
MAX_TOKENS_PER_CHUNK = int(os.getenv("MAX_TOKENS_PER_CHUNK", 800))
MEETING_TYPE = os.getenv("MEETING_TYPE", "generic meeting")
FOCUS_REQUEST = os.getenv("FOCUS_REQUEST", "Focus on tasks, decisions, deadlines.")

