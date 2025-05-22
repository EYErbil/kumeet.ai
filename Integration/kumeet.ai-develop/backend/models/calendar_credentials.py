from pydantic import BaseModel, Field
from typing import Optional, Dict, Literal, List
from datetime import datetime

class CalendarCredentials(BaseModel):
    id: Optional[str] = None
    user_id: str
    calendar_type: Literal["google", "outlook"]
    access_token: str
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        arbitrary_types_allowed = True

class GoogleCredentials(CalendarCredentials):
    calendar_type: Literal["google"] = "google"
    token_uri: str = "https://oauth2.googleapis.com/token"
    client_id: str
    client_secret: str
    scopes: List[str]
    email: Optional[str] = None

class OutlookCredentials(CalendarCredentials):
    calendar_type: Literal["outlook"] = "outlook"
    client_id: str
    tenant_id: str
    scopes: List[str] 