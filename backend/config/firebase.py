import firebase_admin
from firebase_admin import credentials
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    # Check if Firebase is already initialized
    if len(firebase_admin._apps) > 0:
        logger.info("Firebase already initialized, skipping")
        return  # Firebase is already initialized
        
    try:
        # Get the path to the service account key file
        current_dir = Path(__file__).parent
        cred_path = current_dir / "firebase-service-account.json"
        
        # Check for environment variable override
        env_cred_path = os.environ.get('FIREBASE_CREDENTIALS_PATH')
        if env_cred_path and Path(env_cred_path).exists():
            cred_path = Path(env_cred_path)
            logger.info(f"Using Firebase credentials from environment: {cred_path}")
            
        # Check if the file exists
        if not cred_path.exists():
            # Alternative locations to check
            alt_paths = [
                Path(os.getcwd()) / "config" / "firebase-service-account.json",
                Path(os.getcwd()) / "firebase-service-account.json",
                Path(os.getcwd()) / "mock_credentials" / "firebase-service-account.json"
            ]
            
            for alt_path in alt_paths:
                if alt_path.exists():
                    logger.info(f"Found credentials at alternative path: {alt_path}")
                    cred_path = alt_path
                    break
                    
        if not cred_path.exists():
            raise FileNotFoundError(
                "Firebase service account key file not found. "
                "Please place your firebase-service-account.json in the backend/config directory "
                "or set the FIREBASE_CREDENTIALS_PATH environment variable."
            )
        
        # Initialize the app
        logger.info(f"Initializing Firebase with credentials from: {cred_path}")
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
        logger.info("Firebase initialization successful")
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        # Continue execution rather than raising an exception - let the application handle fallback
        return False
        
    return True

# Only initialize Firebase when explicitly called, not on import
# This helps with circular imports and allows for more control over initialization timing 