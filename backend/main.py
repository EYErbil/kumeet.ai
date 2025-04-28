from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, meeting, notes, actionItem, user, feedback
from utils.logger import setup_logger
import os
import sys
import time
import db
from models.models import init_db
from services.meeting_service import MeetingService

# Set up logger
logger = setup_logger(__name__)

# Add the current directory to the Python path to help with imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Try to import Firebase, with fallback
try:
    # Instead of trying to import as a package, import directly using the file path
    sys.path.append(os.path.join(os.getcwd(), "config"))
    
    # First try direct import
    try:
        from firebase import initialize_firebase
        logger.info("Imported firebase module directly")
    except ImportError:
        # Fall back to relative import
        from .config.firebase import initialize_firebase
        logger.info("Imported firebase module using relative path")
    
    # Initialize Firebase
    try:
        initialize_firebase()
        logger.info("Firebase initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        logger.error("Continuing without Firebase authentication")
except ImportError as e:
    logger.error(f"Failed to import Firebase module: {str(e)}")
    logger.error(f"Python path: {sys.path}")
    logger.error(f"Working directory: {os.getcwd()}")
    logger.error(f"Directory contents: {os.listdir('.')}")
    if os.path.exists('config'):
        logger.error(f"Config directory exists, contents: {os.listdir('config')}")
    else:
        logger.error("Config directory does not exist")
    logger.error("Continuing without Firebase authentication - some features may be limited")

# Initialize Database
try:
    init_db()
    logger.info("Database tables initialized successfully")
    
    # Ensure required columns exist in the meetings table
    MeetingService.ensure_required_columns()
    logger.info("Verified required database columns")
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
        "http://127.0.0.1:3000",  # Alternative localhost
        "http://127.0.0.1:8000",  # Alternative localhost
        "*",                      # Allow all origins in development (remove in production)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # Important for file download
    max_age=600,  # Cache preflight requests for 10 minutes
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

@app.get("/debug")
async def debug_info():
    """Return debug information about the environment"""
    return {
        "python_path": sys.path,
        "working_directory": os.getcwd(),
        "directory_contents": os.listdir('.'),
        "config_exists": os.path.exists('config'),
        "config_contents": os.listdir('config') if os.path.exists('config') else None,
        "env_vars": dict(os.environ)
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return {"detail": "An internal server error occurred"}

@app.on_event("startup")
async def startup_event():
    """Initialize the database on startup"""
    init_db()