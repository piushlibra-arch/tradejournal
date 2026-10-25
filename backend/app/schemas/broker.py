from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field


class BrokerConnectPayload(BaseModel):
    broker_id: str = Field(default="dhan", max_length=50)
    client_id: str = Field(..., max_length=100)
    access_token: str = Field(..., min_length=10)
    account_id: Optional[uuid.UUID] = None


class BrokerConnectionResponse(BaseModel):
    id: str
    broker_id: str
    client_id: str
    account_id: Optional[str] = None
    is_active: bool
    sync_status: str
    last_sync_at: Optional[str] = None
    last_error: Optional[str] = None
    created_at: str


class BrokerSyncResponse(BaseModel):
    broker_id: str
    total_fetched: int
    new_executions: int
    new_trades: int
    skipped_duplicates: int
    last_sync_at: str


class BrokerProviderInfo(BaseModel):
    id: str
    name: str
    country: str
    features: List[str]
    status: str
    auth_fields: List[Dict[str, Any]]
