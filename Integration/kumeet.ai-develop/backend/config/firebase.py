import firebase_admin
from firebase_admin import credentials
import os
from pathlib import Path
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    # Check if Firebase is already initialized
    if len(firebase_admin._apps) > 0:
        logger.info("Firebase already initialized")
        return  # Firebase is already initialized
    
    # Check for development mode
    dev_mode = settings.DEBUG or os.environ.get("FIREBASE_DEVELOPMENT_MODE", "").lower() in ("true", "1", "yes")
    
    if dev_mode:
        logger.warning("Running in DEVELOPMENT MODE - Firebase authentication is DISABLED")
        logger.warning("This should only be used for development environments!")
        # Skip Firebase initialization in development mode
        return
        
    try:
        # Get the path to the service account key file from settings
        cred_path = Path(settings.FIREBASE_CREDENTIALS_PATH)
        
        if not cred_path.exists():
            logger.warning(f"Firebase credentials file not found at {cred_path}")
            
            # Try fallback location
            default_path = Path(__file__).parent / "firebase-service-account.json"
            if default_path.exists():
                cred_path = default_path
                logger.info(f"Using default Firebase credentials at {default_path}")
            else:
                raise FileNotFoundError(
                    "Firebase service account key file not found. "
                    "Please place your firebase-service-account.json in the backend/config directory "
                    "or set the FIREBASE_CREDENTIALS_PATH environment variable."
                )
        
        logger.info(f"Initializing Firebase with credentials from {cred_path}")
        
        # Initialize the app
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
        logger.info("Firebase initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        raise Exception(f"Failed to initialize Firebase: {str(e)}")

# Initialize Firebase when this module is imported
initialize_firebase() 