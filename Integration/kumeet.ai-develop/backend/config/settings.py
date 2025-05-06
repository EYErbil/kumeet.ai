import os
from pydantic_settings import BaseSettings

from typing import List, Optional

class Settings(BaseSettings):
    """
    Application settings that can be loaded from environment variables.
    
    All settings can be overridden with environment variables.
    For example: APP_DEBUG=True will set debug=True
    """
    # Application settings
    APP_NAME: str = "KuMeet API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    
    # API settings
    API_PREFIX: str = "/api"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://frontend:3000",
        "http://localhost:8000",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # Database settings
    DB_HOST: str = os.environ.get("DB_HOST", "localhost")
    DB_PORT: str = os.environ.get("DB_PORT", "5432")
    DB_NAME: str = os.environ.get("DB_NAME", "kumeet")
    DB_USER: str = os.environ.get("DB_USER", "postgres")
    DB_PASSWORD: str = os.environ.get("DB_PASSWORD", "PASSWORD")
    DATABASE_URL: Optional[str] = os.environ.get("DATABASE_URL")
    DB_POOL_MIN_SIZE: int = 1
    DB_POOL_MAX_SIZE: int = 10

    # Firebase settings
    FIREBASE_CREDENTIALS_PATH: Optional[str] = os.environ.get("FIREBASE_CREDENTIALS_PATH",
                                                              "./config/firebase-credentials.json")
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY: Optional[str] = None
    FIREBASE_CLIENT_EMAIL: Optional[str] = None

    # Google Calendar settings
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None

    # Outlook Calendar settings
    OUTLOOK_CLIENT_ID: Optional[str] = None
    OUTLOOK_TENANT_ID: Optional[str] = None
    OUTLOOK_CLIENT_SECRET: Optional[str] = None
    OUTLOOK_REDIRECT_URI: Optional[str] = None
    
    # Logging settings
    LOG_LEVEL: str = "INFO"
    
    # File storage settings
    UPLOAD_DIR: str = "./uploads"
    
    class Config:
        env_prefix = ""  # Use environment variables without prefix
        env_file = ".env"  # Load settings from .env file if available
        case_sensitive = True

# Create a settings instance
settings = Settings() 