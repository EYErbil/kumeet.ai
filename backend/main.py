from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, meeting, notes, actionItem, user, feedback
from utils.logger import setup_logger
from config.firebase import initialize_firebase
import time
import db
from models.models import init_db

# Set up logger
logger = setup_logger(__name__)

# Initialize Firebase
try:
    initialize_firebase()
    logger.info("Firebase initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Firebase: {str(e)}")
    raise

# Initialize Database
try:
    init_db()
    logger.info("Database tables initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize database tables: {str(e)}")
    raise

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend URL in local development
        "http://frontend:3000",   # Frontend URL in Docker
        "http://localhost:8000",  # Additional URL from develop branch
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add routes
app.include_router(auth.router, prefix="/api/auth")
app.include_router(meeting.router, prefix="/api/meetings")
app.include_router(notes.router, prefix="/api/notes")
app.include_router(actionItem.router, prefix="/api/action-items")
app.include_router(user.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")

# Log all registered routes for debugging
for route in app.routes:
    logger.info(f"Registered route: {route.path}")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} "
        f"completed in {duration:.2f}s with status {response.status_code}"
    )
    return response

@app.get("/")
async def read_root():
    logger.info("Root endpoint accessed")
    return {"message": "Welcome to the KuMeet API"}

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return {"detail": "An internal server error occurred"}