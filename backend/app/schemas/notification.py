from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    title: str = Field(..., max_length=200)
    message: str
    type: str = Field(default="info", max_length=50)  # info, success, warning, error
    action_url: Optional[str] = Field(default=None, max_length=500)
    extra_data: Optional[Dict[str, Any]] = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    message: str
    type: str
    is_read: bool
    action_url: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    created_at: str


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int
