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

def create_results_subdir(base_name: str) -> str:
    """
    Create a uniquely named results subdirectory based on the input filename.
    """
    # Create a timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Extract just the filename without extension
    clean_name = os.path.splitext(os.path.basename(base_name))[0]
    
    # Create a clean directory name
    dir_name = f"{timestamp}_{clean_name}"
    
    # Full path to the new directory
    path = os.path.join(RESULTS_DIR, dir_name)
    
    # Create the directory
    os.makedirs(path, exist_ok=True)
    
    return path
