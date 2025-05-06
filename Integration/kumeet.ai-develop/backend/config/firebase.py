import firebase_admin
from firebase_admin import credentials
import os
from pathlib import Path

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    # Check if Firebase is already initialized
    if len(firebase_admin._apps) > 0:
        return  # Firebase is already initialized
        
    try:
        # Get the path to the service account key file
        cred_path = Path(__file__).parent / "firebase-service-account.json"
        
        if not cred_path.exists():
            raise FileNotFoundError(
                "Firebase service account key file not found. "
                "Please place your firebase-service-account.json in the backend/config directory."
            )
        
        # Initialize the app
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
        
    except Exception as e:
        raise Exception(f"Failed to initialize Firebase: {str(e)}")

# Initialize Firebase when this module is imported
initialize_firebase() 