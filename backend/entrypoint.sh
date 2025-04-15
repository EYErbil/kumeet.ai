#!/bin/bash
set -e

echo "Starting backend entrypoint script..."

# Create required directories
mkdir -p /app/results /app/uploads /app/data /app/logs
chmod -R 777 /app/results /app/uploads /app/data /app/logs

# Print environment for debugging
echo "Python path: $PYTHONPATH"
echo "Working directory: $(pwd)"
echo "Directory contents: $(ls -la)"

# Set up Python path explicitly
export PYTHONPATH=$PYTHONPATH:/app

# Try installing requirements
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check for summarizer requirements in different possible locations
echo "Looking for summarizer requirements..."
if [ -f "summarizer_requirements.txt" ]; then
    echo "Found summarizer_requirements.txt"
    pip install -r summarizer_requirements.txt
elif [ -f "summarizer/requirements.txt" ]; then
    echo "Found summarizer/requirements.txt"
    pip install -r summarizer/requirements.txt
elif [ -f "../summarizer/requirements.txt" ]; then
    echo "Found ../summarizer/requirements.txt"
    pip install -r ../summarizer/requirements.txt
else
    echo "WARNING: Could not find summarizer requirements file"
fi

# Make sure all necessary packages for summarizer are installed
echo "Installing essential summarizer packages..."
pip install pyannote.audio faster-whisper torch google-generativeai pandas

# Print available Python modules for debugging
echo "Installed Python packages:"
pip list

# Initialize the database (this is handled in the service file)
echo "Ready to start server..."

# Run the server
exec uvicorn main:app --host 0.0.0.0 --port 8000 