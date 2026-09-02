from pydantic import BaseModel
from bson import ObjectId

class Meeting(BaseModel):
    id: str = None
    title: str
    transcription: str
    summary: str
    action_items: list

    class Config:
        arbitrary_types_allowed = True 