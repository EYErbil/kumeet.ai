# utils.py

import os
import uuid
import re

from config import RESULTS_DIR

def safe_filename(name: str) -> str:
    return re.sub(r'[^a-zA-Z0-9_\-]', '_', name)

def create_results_subdir(filename: str) -> str:
    base = os.path.splitext(os.path.basename(filename))[0]
    base_sanit = safe_filename(base)
    unique_id = str(uuid.uuid4())[:8]
    out_dir = os.path.join(RESULTS_DIR, f"{base_sanit}_{unique_id}")
    os.makedirs(out_dir, exist_ok=True)
    return out_dir
