import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class JournalEntryBase(BaseModel):
    date: date
    pre_market_plan: Optional[str] = None
    post_market_review: Optional[str] = None
    lessons_learned: Optional[str] = None
    emotional_state: Optional[str] = Field(None, max_length=100)
    discipline_score: Optional[int] = Field(None, ge=1, le=10)
    market_bias: Optional[str] = Field(None, max_length=50)
    screenshots: Optional[List[Dict[str, Any]]] = None


class JournalEntryCreate(JournalEntryBase):
    pass


class JournalEntryUpdate(BaseModel):
    pre_market_plan: Optional[str] = None
    post_market_review: Optional[str] = None
    lessons_learned: Optional[str] = None
    emotional_state: Optional[str] = Field(None, max_length=100)
    discipline_score: Optional[int] = Field(None, ge=1, le=10)
    market_bias: Optional[str] = Field(None, max_length=50)
    screenshots: Optional[List[Dict[str, Any]]] = None


class JournalEntryResponse(JournalEntryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JournalEntryListResponse(BaseModel):
    items: List[JournalEntryResponse]
    total: int
