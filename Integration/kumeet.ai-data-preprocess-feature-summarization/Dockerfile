# ─────────────────────────────────────────────────────────────
# CUDA 12.6  +  cuDNN 9.1  runtime  (Ubuntu 22.04)
# ─────────────────────────────────────────────────────────────
FROM nvidia/cuda:12.6.3-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install Python 3.10, pip, and other system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3-pip \
    python3.10-dev \
    ffmpeg \
    libsndfile1 \
    git \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Make python3.10 the default python
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

RUN pip install typing-extensions==4.10.0
# Install PyTorch with CUDA support (specific version as requested)
# The base image already has CUDA, so PyTorch should find it.
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126


# Install Python dependencies
# Removed --no-deps as discussed
RUN pip install openai-whisper  && \
    pip install faster-whisper  && \
    pip install pyannote.audio  && \
    pip install -U openai && \
    pip install pandas numpy google-generativeai scikit-learn transformers protobuf pydantic && \
    pip install av && \
    pip install google-api-python-client

# Copy the source code
COPY . .
RUN python -c "import torch; print('Torch Version:', torch.__version__); print('CUDA Available:', torch.cuda.is_available()); print('CUDA Version Detected by PyTorch:', torch.version.cuda); import os; print('NVIDIA_VISIBLE_DEVICES:', os.environ.get('NVIDIA_VISIBLE_DEVICES'))"

# Create directories for shared data
RUN mkdir -p /app/shared_data/uploads /app/shared_data/results

# Set working directory to the summarizer folder
WORKDIR /app/summarizer

# Initialize the database
RUN python -c "from db import init_db; init_db()"

# Create a shell script to run the data-preprocess command
RUN echo '#!/bin/bash\npython /app/summarizer/main.py "$@"' > /app/run-summarizer.sh && \
    chmod +x /app/run-summarizer.sh

# Return to the app directory
WORKDIR /app

# Default command - keep container running
CMD ["tail", "-f", "/dev/null"] 