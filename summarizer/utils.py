# utils.py

import os
import datetime
import uuid
import re

# Handle imports in a flexible way
try:
    # Try direct imports first (when running as a script)
    from config import RESULTS_DIR
except ImportError:
    # Fall back to package imports (when imported as a module)
    try:
        from summarizer.config import RESULTS_DIR
    except ImportError:
        # Define a default if all else fails
        RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")

def safe_filename(name: str) -> str:
    return re.sub(r'[^a-zA-Z0-9_\-]', '_', name)

def create_results_subdir(filename: str) -> str:
    try:
        from config import RESULTS_DIR
    except ImportError:
        try:
            from summarizer.config import RESULTS_DIR
        except ImportError:
            RESULTS_DIR = "results"
    
    base = os.path.splitext(os.path.basename(filename))[0]
    base_sanit = safe_filename(base)
    unique_id = str(uuid.uuid4())[:8]
    out_dir = os.path.join(RESULTS_DIR, f"{base_sanit}_{unique_id}")
    os.makedirs(out_dir, exist_ok=True)
    return out_dir
