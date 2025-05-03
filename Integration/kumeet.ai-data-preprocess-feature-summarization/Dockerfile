FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    git \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN pip install typing-extensions==4.10.0
# Install PyTorch with CUDA support (specific version as requested)
RUN pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126

# Install Python dependencies directly (no requirements.txt)
RUN pip install openai-whisper --no-deps && \
    pip install faster-whisper --no-deps && \
    pip install pyannote.audio --no-deps && \
    pip install -U openai && \
    pip install pandas numpy google-generativeai scikit-learn transformers protobuf pydantic

# Copy the source code
COPY . .
RUN python -c "import torch; print('Torch Version:', torch.__version__); print('CUDA Version:', torch.version.cuda)"

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