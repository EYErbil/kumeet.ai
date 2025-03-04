import logging
import sys
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler

# Get the backend directory path
backend_dir = Path(__file__).parent.parent

# Create logs directory if it doesn't exist
logs_dir = backend_dir / "logs"
logs_dir.mkdir(exist_ok=True)

def setup_logger(name: str) -> logging.Logger:
    """
    Set up a logger with both file and console handlers
    """
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    simple_formatter = logging.Formatter(
        '%(levelname)s: %(message)s'
    )

    # File handler (detailed logging)
    file_handler = RotatingFileHandler(
        logs_dir / "app.log",
        maxBytes=1024 * 1024,  # 1MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(detailed_formatter)

    # Console handler (simpler logging)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(simple_formatter)

    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger 