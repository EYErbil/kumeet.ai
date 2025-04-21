FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    git \
    libsndfile1 \
    libsndfile1-dev \
    libportaudio2 \
    libportaudiocpp0 \
    portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip3 install -r requirements.txt && \
    pip3 install torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cu121 && \
    pip3 install numpy==1.24.4 pyannote.audio==3.1.1 faster-whisper openai google-generativeai pydub python-multipart fastapi uvicorn


# Copy the summarizer code
COPY . /app/

# Create necessary directories
RUN mkdir -p /app/data/input /app/data/output /app/results

# Set environment variables
ENV PYTHONPATH=/app
ENV HF_HOME=/app/cache

# Expose port for API
EXPOSE 8001

# Command to run the summarizer service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]