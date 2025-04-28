# To built image:
# docker build -t my-backend-image .

# To start:
# docker run -d -p 8000:8000 my-backend-image

FROM python:3.10-slim

WORKDIR /app

# Install FFmpeg and other system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    build-essential \
    libpq-dev \
    gcc \
    g++ \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install -r requirements.txt

# Install summarizer dependencies directly
RUN pip install \
    pyannote.audio \
    faster-whisper \
    torch \
    google-generativeai \
    pandas \
    openai \
    pydub

# Create necessary directories
RUN mkdir -p /app/logs /app/data /app/uploads /app/results

# Copy the rest of the application
COPY . .

# Set execute permissions for the entrypoint script
RUN chmod +x /app/entrypoint.sh

# Expose port for API
EXPOSE 8000

# Use our entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]