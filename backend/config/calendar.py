import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Google Calendar API credentials
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/calendar/google/callback")

# Microsoft Graph API credentials
OUTLOOK_CLIENT_ID = os.getenv("OUTLOOK_CLIENT_ID")
OUTLOOK_TENANT_ID = os.getenv("OUTLOOK_TENANT_ID")
OUTLOOK_REDIRECT_URI = os.getenv("OUTLOOK_REDIRECT_URI", "http://localhost:3000/calendar/outlook/callback")

# Set environment variables if not already set
if not os.getenv("GOOGLE_CLIENT_ID"):
    os.environ["GOOGLE_CLIENT_ID"] = GOOGLE_CLIENT_ID or ""
if not os.getenv("GOOGLE_CLIENT_SECRET"):
    os.environ["GOOGLE_CLIENT_SECRET"] = GOOGLE_CLIENT_SECRET or ""
if not os.getenv("GOOGLE_REDIRECT_URI"):
    os.environ["GOOGLE_REDIRECT_URI"] = GOOGLE_REDIRECT_URI

if not os.getenv("OUTLOOK_CLIENT_ID"):
    os.environ["OUTLOOK_CLIENT_ID"] = OUTLOOK_CLIENT_ID or ""
if not os.getenv("OUTLOOK_TENANT_ID"):
    os.environ["OUTLOOK_TENANT_ID"] = OUTLOOK_TENANT_ID or ""
if not os.getenv("OUTLOOK_REDIRECT_URI"):
    os.environ["OUTLOOK_REDIRECT_URI"] = OUTLOOK_REDIRECT_URI 