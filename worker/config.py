"""Runtime configuration for the optional KuMeet AI worker.

Secrets are read from the environment only. Copy ".env.example" to ".env"
for local development and never commit the populated file.
"""

import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()

# Model-provider credentials
HF_TOKEN = os.getenv("HF_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Output and local state
RESULTS_DIR = os.getenv("RESULTS_DIR", str(Path(__file__).parent / "results"))
DB_PATH = os.getenv("DB_PATH", str(Path(RESULTS_DIR) / "summaries.db"))

# Diarization and transcription
MIN_DURATION = float(os.getenv("MIN_DURATION", "0.5"))
GAP_THRESHOLD = float(os.getenv("GAP_THRESHOLD", "4.0"))
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "normal")
USE_GPU = os.getenv("USE_GPU", "false").lower() == "true"

# Summarization
MAX_TOKENS_PER_CHUNK = int(os.getenv("MAX_TOKENS_PER_CHUNK", "800"))
MEETING_TYPE = os.getenv("MEETING_TYPE", "generic meeting")
FOCUS_REQUEST = os.getenv(
    "FOCUS_REQUEST",
    "Focus on tasks, decisions, and deadlines.",
)


def validate_provider_credentials() -> None:
    """Fail with a useful message before a processing job starts."""
    missing = [
        name
        for name, value in (
            ("HF_TOKEN", HF_TOKEN),
            ("GEMINI_API_KEY", GEMINI_API_KEY),
        )
        if not value
    ]
    if missing:
        names = ", ".join(missing)
        raise RuntimeError(
            f"Missing required worker environment variable(s): {names}. "
            "Copy worker/.env.example to worker/.env and provide your own values."
        )
