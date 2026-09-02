"""Application configuration loaded from environment variables."""

from typing import List, Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        case_sensitive=True,
        extra="ignore",
    )

    # Application and API
    APP_NAME: str = "KuMeet API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # Browser clients. In an env file, use a JSON array.
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://frontend:3000",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # PostgreSQL
    DB_HOST: str = "localhost"
    DB_PORT: str = "5432"
    DB_NAME: str = "kumeet"
    DB_USER: str = "kumeet"
    DB_PASSWORD: str = "change-me"
    DATABASE_URL: Optional[str] = None
    DB_POOL_MIN_SIZE: int = 1
    DB_POOL_MAX_SIZE: int = 10

    # Firebase Admin. Prefer a mounted credential file. The individual fields
    # are useful for deployment platforms that inject secrets as variables.
    FIREBASE_DEVELOPMENT_MODE: bool = False
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY: Optional[str] = None
    FIREBASE_CLIENT_EMAIL: Optional[str] = None

    # Optional calendar integrations
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/calendar/google/callback"
    OUTLOOK_CLIENT_ID: Optional[str] = None
    OUTLOOK_TENANT_ID: Optional[str] = None
    OUTLOOK_CLIENT_SECRET: Optional[str] = None
    OUTLOOK_REDIRECT_URI: str = "http://localhost:3000/calendar/outlook/callback"

    # File storage
    SHARED_VOLUME_PATH: str = "/app/shared_data"
    UPLOAD_DIR: str = "/app/shared_data/uploads"

    # The public stack defaults to disabled processing. The original demo used
    # the cluster mode with an SSH key mounted at runtime.
    PROCESSING_MODE: Literal["disabled", "cluster"] = "disabled"
    CLUSTER_HOST: Optional[str] = None
    CLUSTER_USER: Optional[str] = None
    CLUSTER_REMOTE_DIR: Optional[str] = None
    CLUSTER_SSH_KEY_PATH: str = "/run/secrets/cluster_ssh_key"
    CLUSTER_KNOWN_HOSTS_PATH: str = "/run/secrets/cluster_known_hosts"
    CLUSTER_WORKER_SCRIPT: Optional[str] = None
    CLUSTER_PYTHON_EXECUTABLE: str = "python"
    CLUSTER_SETUP_COMMANDS: str = ""
    CLUSTER_POLL_INTERVAL_SECONDS: int = 10
    CLUSTER_JOB_TIMEOUT_SECONDS: int = 1800

    # Slurm job settings for an optional private deployment
    SLURM_PARTITION: Optional[str] = None
    SLURM_ACCOUNT: Optional[str] = None
    SLURM_QOS: Optional[str] = None
    SLURM_GRES: str = "gpu:1"
    SLURM_TIME: str = "00:30:00"
    SLURM_CPUS_PER_TASK: int = 4
    SLURM_MEMORY: str = "16G"
    SLURM_NODELIST: Optional[str] = None

    LOG_LEVEL: str = "INFO"


settings = Settings()
