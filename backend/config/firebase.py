"""Firebase Admin initialization without bundled credentials."""

from pathlib import Path

import firebase_admin
from firebase_admin import credentials

from config.settings import settings


def _credential_from_environment():
    if not all(
        (
            settings.FIREBASE_PROJECT_ID,
            settings.FIREBASE_PRIVATE_KEY,
            settings.FIREBASE_CLIENT_EMAIL,
        )
    ):
        return None

    private_key = settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n")
    return credentials.Certificate(
        {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key": private_key,
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )


def initialize_firebase():
    """Initialize Firebase from a mounted file or injected environment values."""
    if firebase_admin._apps:
        return firebase_admin.get_app()

    credential = None

    if settings.FIREBASE_CREDENTIALS_PATH:
        credential_path = Path(settings.FIREBASE_CREDENTIALS_PATH).expanduser()
        if not credential_path.is_file():
            raise RuntimeError(
                "FIREBASE_CREDENTIALS_PATH does not point to a readable file."
            )
        credential = credentials.Certificate(str(credential_path))
    else:
        credential = _credential_from_environment()

    if credential is not None:
        return firebase_admin.initialize_app(credential)

    if settings.FIREBASE_DEVELOPMENT_MODE:
        return firebase_admin.initialize_app(
            options={"projectId": settings.FIREBASE_PROJECT_ID or "kumeet-local-dev"}
        )

    raise RuntimeError(
        "Firebase Admin is not configured. Mount a service-account file and set "
        "FIREBASE_CREDENTIALS_PATH, inject FIREBASE_PROJECT_ID, "
        "FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL, or explicitly enable "
        "FIREBASE_DEVELOPMENT_MODE for local UI work."
    )
