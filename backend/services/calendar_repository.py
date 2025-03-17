from typing import List, Optional, Union
from datetime import datetime, timedelta
import json
from bson import ObjectId
from unittest.mock import MagicMock

from models.calendar_event import CalendarEvent
from models.calendar_credentials import CalendarCredentials, GoogleCredentials, OutlookCredentials
from utils.logger import setup_logger
import db

logger = setup_logger(__name__)

class CalendarRepository:
    def __init__(self):
        self.db = db.get_db()
        self.credentials_collection = self.db["calendar_credentials"]
        self.events_collection = self.db["calendar_events"]
    
    # Calendar Credentials methods
    
    def save_credentials(self, credentials: CalendarCredentials) -> str:
        """Save calendar credentials to the database."""
        # Convert to dict for storage
        credentials_dict = credentials.dict()
        
        # Handle datetime objects for MongoDB
        if credentials.token_expiry:
            credentials_dict["token_expiry"] = credentials.token_expiry.isoformat() if hasattr(credentials.token_expiry, 'isoformat') else credentials.token_expiry
        if credentials.created_at:
            credentials_dict["created_at"] = credentials.created_at.isoformat() if hasattr(credentials.created_at, 'isoformat') else credentials.created_at
        if credentials.updated_at:
            credentials_dict["updated_at"] = credentials.updated_at.isoformat() if hasattr(credentials.updated_at, 'isoformat') else credentials.updated_at
        
        # Check if we're using a mock database
        is_mock = isinstance(self.credentials_collection, MagicMock) or isinstance(self.db, MagicMock)
        
        if is_mock:
            logger.info(f"Using mock database for saving credentials for user {credentials.user_id}")
            
            # Save credentials to a file
            import os
            import json
            
            # Create a mock credentials directory if it doesn't exist
            mock_creds_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mock_credentials")
            os.makedirs(mock_creds_dir, exist_ok=True)
            
            # Generate a mock ID if not provided
            if not credentials.id:
                from datetime import datetime
                credentials_dict["id"] = f"mock_cred_{int(datetime.now().timestamp())}"
            else:
                credentials_dict["id"] = credentials.id
                
            # Save credentials to a file
            mock_creds_file = os.path.join(mock_creds_dir, f"{credentials.user_id}_{credentials.calendar_type}.json")
            
            try:
                with open(mock_creds_file, 'w') as f:
                    json.dump(credentials_dict, f)
                logger.info(f"Saved credentials to file: {mock_creds_file}")
                return credentials_dict["id"]
            except Exception as e:
                logger.error(f"Error saving credentials to file: {str(e)}")
                return "mock_error_id"
        
        # Check if credentials already exist for this user and calendar type
        existing = self.credentials_collection.find_one({
            "user_id": credentials.user_id,
            "calendar_type": credentials.calendar_type
        })
        
        if existing:
            # Update existing credentials
            credentials_dict["_id"] = existing["_id"]
            self.credentials_collection.replace_one({"_id": existing["_id"]}, credentials_dict)
            return str(existing["_id"])
        else:
            # Insert new credentials
            result = self.credentials_collection.insert_one(credentials_dict)
            return str(result.inserted_id)
    
    def get_credentials(self, user_id: str, calendar_type: str) -> Optional[Union[GoogleCredentials, OutlookCredentials]]:
        """Get calendar credentials for a user and calendar type."""
        try:
            logger.info(f"Attempting to get credentials for user {user_id} and calendar type {calendar_type}")
            
            # Check if we're using a mock database
            is_mock = isinstance(self.credentials_collection, MagicMock) or isinstance(self.db, MagicMock)
            
            if is_mock:
                logger.info("Using mock database, checking for real OAuth credentials")
                
                # For Google Calendar, check if we have real OAuth credentials in environment variables
                if calendar_type == "google":
                    from config.calendar import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
                    
                    # Check if we have a saved credentials file for this user
                    import os
                    import json
                    from datetime import datetime, timedelta
                    
                    # Create a mock credentials directory if it doesn't exist
                    mock_creds_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mock_credentials")
                    os.makedirs(mock_creds_dir, exist_ok=True)
                    
                    # Check if we have saved credentials for this user
                    mock_creds_file = os.path.join(mock_creds_dir, f"{user_id}_{calendar_type}.json")
                    
                    if os.path.exists(mock_creds_file):
                        try:
                            with open(mock_creds_file, 'r') as f:
                                saved_creds = json.load(f)
                                
                            logger.info(f"Found saved credentials for user {user_id} in mock database")
                            
                            # Create a credentials object with the saved data
                            from models.calendar_credentials import GoogleCredentials
                            
                            credentials = GoogleCredentials(
                                id=saved_creds.get("id", "mock_google_cred_id"),
                                user_id=user_id,
                                calendar_type="google",
                                access_token=saved_creds.get("access_token", ""),
                                refresh_token=saved_creds.get("refresh_token", ""),
                                token_expiry=datetime.fromisoformat(saved_creds.get("token_expiry", datetime.now().isoformat())),
                                client_id=GOOGLE_CLIENT_ID,
                                client_secret=GOOGLE_CLIENT_SECRET,
                                scopes=saved_creds.get("scopes", ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]),
                                token_uri="https://oauth2.googleapis.com/token",
                                email=saved_creds.get("email", "")
                            )
                            
                            # Check if tokens are present
                            if not credentials.access_token or not credentials.refresh_token:
                                logger.warning("Saved credentials are missing tokens")
                                return None
                                
                            logger.info(f"Successfully loaded credentials for user {user_id} from mock database")
                            return credentials
                        except Exception as e:
                            logger.error(f"Error loading saved credentials: {str(e)}")
                    
                    # If we have real OAuth credentials, create a credentials object
                    if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
                        from models.calendar_credentials import GoogleCredentials
                        
                        # Create a credentials object with the real client ID and secret
                        credentials = GoogleCredentials(
                            id="mock_real_google_cred_id",
                            user_id=user_id,
                            calendar_type="google",
                            access_token="",  # Will be obtained through OAuth
                            refresh_token="",  # Will be obtained through OAuth
                            token_expiry=datetime.now() + timedelta(days=1),
                            client_id=GOOGLE_CLIENT_ID,
                            client_secret=GOOGLE_CLIENT_SECRET,
                            scopes=["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
                            token_uri="https://oauth2.googleapis.com/token"
                        )
                        
                        logger.info(f"Created real OAuth credentials object for user {user_id}")
                        return None  # Still return None to trigger the OAuth flow
                
                logger.info("Using mock database, returning None to trigger proper authentication")
                return None  # Return None to trigger proper authentication
            
            # For real database, continue with normal processing
            credentials = self.credentials_collection.find_one({
                "user_id": user_id,
                "calendar_type": calendar_type
            })
            
            if not credentials:
                logger.info(f"No credentials found for user {user_id} and calendar type {calendar_type}")
                return None
            
            # Log what we found
            logger.info(f"Found credentials for user {user_id} and calendar type {calendar_type}")
            logger.info(f"Credentials keys: {', '.join(credentials.keys())}")
            
            # Convert MongoDB _id to string id
            credentials["id"] = str(credentials.pop("_id"))
            
            # Check if credentials has all required fields
            if calendar_type == "google":
                required_fields = ["user_id", "client_id", "client_secret", "scopes"]
                token_fields = ["access_token", "refresh_token"]
            elif calendar_type == "outlook":
                required_fields = ["user_id", "client_id", "tenant_id", "scopes"]
                token_fields = ["access_token", "refresh_token"]
            else:
                logger.error(f"Unsupported calendar type: {calendar_type}")
                return None
            
            # Check if all required fields are present
            missing_fields = [field for field in required_fields if field not in credentials or not credentials[field]]
            if missing_fields:
                logger.error(f"Missing required fields in credentials: {missing_fields}")
                # Delete invalid credentials
                self.delete_credentials(user_id, calendar_type)
                return None
            
            # Check if tokens are present
            missing_tokens = [field for field in token_fields if field not in credentials or not credentials[field]]
            if missing_tokens:
                logger.warning(f"Missing token fields in credentials: {missing_tokens}")
                # Instead of creating mock tokens, delete the invalid credentials and return None
                logger.info("Deleting invalid credentials due to missing tokens")
                self.delete_credentials(user_id, calendar_type)
                return None
            else:
                # Log the access token (first few characters)
                if "access_token" in credentials and credentials["access_token"]:
                    token_preview = credentials["access_token"][:10] + "..." if len(credentials["access_token"]) > 10 else credentials["access_token"]
                    logger.info(f"Access token preview: {token_preview}")
                
                # Log the refresh token (existence only)
                if "refresh_token" in credentials and credentials["refresh_token"]:
                    logger.info("Refresh token is present")
            
            # Create the appropriate credentials object
            try:
                if calendar_type == "google":
                    return GoogleCredentials(**credentials)
                elif calendar_type == "outlook":
                    return OutlookCredentials(**credentials)
                else:
                    logger.error(f"Unsupported calendar type: {calendar_type}")
                    return None
            except Exception as e:
                logger.error(f"Error creating credentials object: {str(e)}")
                # If there's an error creating the credentials object, delete the invalid credentials
                self.delete_credentials(user_id, calendar_type)
                return None
        except Exception as e:
            logger.error(f"Error retrieving credentials from database: {str(e)}")
            return None
    
    def update_credentials(self, credentials: CalendarCredentials) -> bool:
        """Update calendar credentials in the database."""
        if not credentials.id:
            logger.error("Cannot update credentials without id")
            return False
        
        # Convert to dict for storage
        credentials_dict = credentials.dict(exclude={"id"})
        
        # Handle datetime objects for MongoDB
        if credentials.token_expiry:
            credentials_dict["token_expiry"] = credentials.token_expiry.isoformat() if hasattr(credentials.token_expiry, 'isoformat') else credentials.token_expiry
        if credentials.created_at:
            credentials_dict["created_at"] = credentials.created_at.isoformat() if hasattr(credentials.created_at, 'isoformat') else credentials.created_at
        if credentials.updated_at:
            credentials_dict["updated_at"] = credentials.updated_at.isoformat() if hasattr(credentials.updated_at, 'isoformat') else credentials.updated_at
        
        # Check if we're using a mock database
        is_mock = isinstance(self.credentials_collection, MagicMock) or isinstance(self.db, MagicMock)
        
        if is_mock:
            logger.info(f"Using mock database for updating credentials for user {credentials.user_id}")
            
            # Update credentials in the file
            import os
            import json
            
            # Create a mock credentials directory if it doesn't exist
            mock_creds_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mock_credentials")
            os.makedirs(mock_creds_dir, exist_ok=True)
            
            # Get the file path
            mock_creds_file = os.path.join(mock_creds_dir, f"{credentials.user_id}_{credentials.calendar_type}.json")
            
            try:
                # Read the existing file if it exists
                if os.path.exists(mock_creds_file):
                    with open(mock_creds_file, 'r') as f:
                        existing_creds = json.load(f)
                else:
                    existing_creds = {}
                
                # Update with new values
                existing_creds.update(credentials_dict)
                existing_creds["id"] = credentials.id
                
                # Save back to the file
                with open(mock_creds_file, 'w') as f:
                    json.dump(existing_creds, f)
                
                logger.info(f"Updated credentials in file: {mock_creds_file}")
                logger.info(f"Updated email to: {getattr(credentials, 'email', None)}")
                return True
            except Exception as e:
                logger.error(f"Error updating credentials in file: {str(e)}")
                return False
        
        # For real database
        result = self.credentials_collection.update_one(
            {"_id": ObjectId(credentials.id)},
            {"$set": credentials_dict}
        )
        
        return result.modified_count > 0
    
    def delete_credentials(self, user_id: str, calendar_type: str) -> bool:
        """Delete calendar credentials from the database."""
        try:
            # Check if we're using a mock database
            is_mock = isinstance(self.credentials_collection, MagicMock) or isinstance(self.db, MagicMock)
            
            if is_mock:
                logger.info(f"Using mock database for deleting credentials for user {user_id} and calendar type {calendar_type}")
                
                # Delete credentials file if it exists
                import os
                mock_creds_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mock_credentials")
                mock_creds_file = os.path.join(mock_creds_dir, f"{user_id}_{calendar_type}.json")
                
                if os.path.exists(mock_creds_file):
                    try:
                        os.remove(mock_creds_file)
                        logger.info(f"Deleted credentials file: {mock_creds_file}")
                    except Exception as e:
                        logger.error(f"Error deleting credentials file: {str(e)}")
                
                return True
            
            # For real database, continue with normal processing
            result = self.credentials_collection.delete_one({
                "user_id": user_id,
                "calendar_type": calendar_type
            })
            
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting credentials: {str(e)}")
            # For development with mock database, return success
            if "MagicMock" in str(e):
                logger.info("Using mock response for credential deletion due to error")
                return True
            raise
    
    # Calendar Events methods
    
    def save_event(self, event: CalendarEvent) -> str:
        """Save a calendar event to the database."""
        # Convert to dict for storage
        event_dict = event.dict()
        
        # Handle datetime objects for MongoDB
        event_dict["start_time"] = event.start_time
        event_dict["end_time"] = event.end_time
        
        if event.id:
            # Update existing event
            event_dict["_id"] = ObjectId(event.id)
            self.events_collection.replace_one({"_id": event_dict["_id"]}, event_dict)
            return event.id
        else:
            # Insert new event
            result = self.events_collection.insert_one(event_dict)
            return str(result.inserted_id)
    
    def get_event(self, event_id: str) -> Optional[CalendarEvent]:
        """Get a calendar event by ID."""
        event = self.events_collection.find_one({"_id": ObjectId(event_id)})
        
        if not event:
            return None
        
        # Convert MongoDB _id to string id
        event["id"] = str(event.pop("_id"))
        
        return CalendarEvent(**event)
    
    def get_events_by_user(self, user_id: str, calendar_type: Optional[str] = None) -> List[CalendarEvent]:
        """Get all calendar events for a user, optionally filtered by calendar type."""
        query = {"user_id": user_id}
        
        if calendar_type:
            query["calendar_type"] = calendar_type
        
        events = list(self.events_collection.find(query))
        
        # Convert MongoDB _id to string id
        for event in events:
            event["id"] = str(event.pop("_id"))
        
        return [CalendarEvent(**event) for event in events]
    
    def get_events_by_meeting(self, meeting_id: str) -> List[CalendarEvent]:
        """Get all calendar events for a meeting."""
        events = list(self.events_collection.find({
            "meeting_id": meeting_id,
            "event_type": "meeting"
        }))
        
        # Convert MongoDB _id to string id
        for event in events:
            event["id"] = str(event.pop("_id"))
        
        return [CalendarEvent(**event) for event in events]
    
    def get_events_by_action_item(self, action_item_id: str) -> List[CalendarEvent]:
        """Get all calendar events for an action item."""
        events = list(self.events_collection.find({
            "action_item_id": action_item_id,
            "event_type": "action_item"
        }))
        
        # Convert MongoDB _id to string id
        for event in events:
            event["id"] = str(event.pop("_id"))
        
        return [CalendarEvent(**event) for event in events]
    
    def update_event(self, event: CalendarEvent) -> bool:
        """Update a calendar event in the database."""
        if not event.id:
            logger.error("Cannot update event without id")
            return False
        
        # Convert to dict for storage
        event_dict = event.dict(exclude={"id"})
        
        # Handle datetime objects for MongoDB
        event_dict["start_time"] = event.start_time
        event_dict["end_time"] = event.end_time
        
        result = self.events_collection.update_one(
            {"_id": ObjectId(event.id)},
            {"$set": event_dict}
        )
        
        return result.modified_count > 0
    
    def delete_event(self, event_id: str) -> bool:
        """Delete a calendar event from the database."""
        result = self.events_collection.delete_one({"_id": ObjectId(event_id)})
        return result.deleted_count > 0
    
    def delete_events_by_meeting(self, meeting_id: str) -> int:
        """Delete all calendar events for a meeting."""
        result = self.events_collection.delete_many({
            "meeting_id": meeting_id,
            "event_type": "meeting"
        })
        return result.deleted_count
    
    def delete_events_by_action_item(self, action_item_id: str) -> int:
        """Delete all calendar events for an action item."""
        result = self.events_collection.delete_many({
            "action_item_id": action_item_id,
            "event_type": "action_item"
        })
        return result.deleted_count 