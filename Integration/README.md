# KuMeet - Meeting Assistant Application

KuMeet is an AI-powered meeting assistant that provides transcription, summarization, and action item extraction for your meetings.

## Architecture

The application consists of several containerized components:

- **Frontend**: React application for user interface
- **Backend**: FastAPI service for API endpoints
- **Data-Preprocess**: AI module for audio processing, transcription, and summarization
- **Database**: PostgreSQL for data storage

## Prerequisites

- Docker and Docker Compose
- Git

## Setup and Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/kumeet.git
cd kumeet
```

2. (Optional) Configure environment variables by creating a `.env` file:
```
# Database
DB_USER=kumeetuser
DB_PASSWORD=kumeetpass
DB_NAME=kumeet

# API
API_PORT=8000

# Shared volume
SHARED_VOLUME_PATH=/app/shared_data
UPLOAD_DIR=/app/shared_data/uploads
```

3. Build and start the containers:
```bash
docker-compose up -d
```

4. Wait for all services to start (this may take a few minutes on first run)

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Usage

1. Create an account or log in
2. Create a new meeting
3. Upload audio/video file for transcription and summarization
4. Add focus question for specific insights
5. View generated transcript, summary, and action items

## Docker Commands

- Build containers: `docker-compose build`
- Start services: `docker-compose up -d`
- View logs: `docker-compose logs -f`
- Stop services: `docker-compose down`
- Remove volumes: `docker-compose down -v`

## Directory Structure

```
kumeet/
├── docker-compose.yml          # Docker Compose configuration
├── kumeet.ai-develop/
│   ├── backend/                # FastAPI backend
│   │   ├── Dockerfile
│   │   └── ...
│   └── frontend/               # React frontend
│       ├── Dockerfile
│       └── ...
└── kumeet.ai-data-preprocess-feature-summarization/
    ├── Dockerfile
    └── summarizer/             # Audio processing and AI module
```

## Data Flow

1. User uploads audio file through the frontend
2. Backend saves the file to the shared volume
3. Backend triggers data-preprocess container to process the file
4. Data-preprocess container:
   - Converts video to audio if needed
   - Diarizes (identifies speakers)
   - Transcribes the audio
   - Generates summary
   - Extracts action items
   - Saves results to files in the shared volume
5. Backend reads the results and stores them in the database
6. Frontend displays results to the user

## Troubleshooting

- Check container logs: `docker-compose logs -f [service_name]`
- Restart a specific service: `docker-compose restart [service_name]`
- Inspect shared volume: `docker exec -it kumeet-backend ls -la /app/shared_data`
- Check database connection: `docker exec -it kumeet-db psql -U kumeetuser -d kumeet` 