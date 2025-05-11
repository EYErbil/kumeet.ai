FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    ffmpeg \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the source code
COPY . .

# Create shared data directories
RUN mkdir -p /app/shared_data/uploads /app/shared_data/results
RUN apt-get update && apt-get install -y --no-install-recommends docker.io && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh
COPY ./ssh/id_ed25519 /root/.ssh/id_ed25519
COPY ./ssh/id_ed25519.pub /root/.ssh/id_ed25519.pub
COPY ./ssh/known_hosts /root/.ssh/known_hosts
RUN chmod 600 /root/.ssh/id_ed25519 && chmod 644 /root/.ssh/id_ed25519.pub && chmod 644 /root/.ssh/known_hosts
# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 