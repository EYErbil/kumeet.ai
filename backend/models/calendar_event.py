from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

class Attendee(BaseModel):
    email: str
    name: Optional[str] = None
    response_status: Optional[str] = None

class CalendarEvent(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    attendees: Optional[List[Attendee]] = []
    calendar_type: Literal["google", "outlook"]
    event_type: Literal["meeting", "action_item"]
    meeting_id: Optional[str] = None
    action_item_id: Optional[str] = None
    user_id: str
    calendar_event_id: Optional[str] = None  # ID from the external calendar service
    
    class Config:
        arbitrary_types_allowed = True

class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    attendees: Optional[List[Attendee]] = []
    calendar_type: Literal["google", "outlook"]
    event_type: Literal["meeting", "action_item"]
    meeting_id: Optional[str] = None
    action_item_id: Optional[str] = None

class ActionItemCalendarEvent(BaseModel):
    action_item_id: str
    title: str
    due_date: datetime
    calendar_type: Literal["google", "outlook"]
    user_id: Optional[str] = None 