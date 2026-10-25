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


class BrokerSyncPayload(BaseModel):
    broker_id: str = Field(default="dhan", max_length=50)
    from_date: Optional[str] = None  # Format: YYYY-MM-DD
    to_date: Optional[str] = None    # Format: YYYY-MM-DD
    sync_ledger: bool = True


class BrokerSyncResponse(BaseModel):
    broker_id: str
    total_fetched: int
    new_executions: int
    new_trades: int
    ledger_entries_imported: int = 0
    skipped_duplicates: int
    last_sync_at: str


class BrokerLedgerEntryResponse(BaseModel):
    id: str
    external_id: str
    voucher_date: str
    voucher_number: Optional[str] = None
    narration: str
    exchange: Optional[str] = None
    debit: float
    credit: float
    running_balance: float
    reconciled: bool


class BrokerLedgerSummaryResponse(BaseModel):
    broker_id: str
    total_records: int
    total_debit: float
    total_credit: float
    net_movement: float
    entries: List[BrokerLedgerEntryResponse]


class BrokerChargesSummaryResponse(BaseModel):
    broker_id: str
    trade_count: int
    charges: Dict[str, float]
    currency: str = "INR"
    provenance_distribution: Dict[str, int]


class BrokerProviderInfo(BaseModel):
    id: str
    name: str
    country: str
    features: List[str]
    status: str
    auth_fields: List[Dict[str, Any]]
