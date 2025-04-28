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

# Print available Python modules for debugging
echo "Installed Python packages:"
pip list | grep -i "pyannote\|numpy\|whisper\|torch"

# Initialize the database (this is handled in the service file)
echo "Ready to start server..."

# Run the server
exec uvicorn main:app --host 0.0.0.0 --port 8000 