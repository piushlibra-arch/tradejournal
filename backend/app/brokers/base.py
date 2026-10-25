from abc import ABC, abstractmethod
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class BrokerExecution(BaseModel):
    external_id: str
    order_id: Optional[str] = None
    symbol: str
    side: str  # "buy" or "sell"
    quantity: Decimal
    price: Decimal
    commission: Decimal = Decimal("0")
    fees: Decimal = Decimal("0")
    executed_at: datetime
    exchange: Optional[str] = "NSE"
    segment: Optional[str] = "EQ"
    raw_data: Optional[Dict[str, Any]] = None


class BrokerPosition(BaseModel):
    symbol: str
    quantity: Decimal
    entry_price: Decimal
    current_price: Optional[Decimal] = None
    unrealized_pnl: Optional[Decimal] = None
    exchange: Optional[str] = None


class BrokerAccountSummary(BaseModel):
    broker_id: str
    client_id: str
    available_cash: Decimal
    margin_used: Decimal = Decimal("0")
    status: str = "connected"
    raw_profile: Optional[Dict[str, Any]] = None


class BaseBrokerAdapter(ABC):
    """Abstract Base Class for Multi-Broker Adapters."""

    def __init__(self, client_id: str, access_token: str):
        self.client_id = client_id
        self.access_token = access_token

    @abstractmethod
    async def test_connection(self) -> BrokerAccountSummary:
        """Validate credentials against the broker's official API and return account summary."""
        pass

    @abstractmethod
    async def fetch_executions(
        self,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> List[BrokerExecution]:
        """Fetch historical executions / trade book records from the broker."""
        pass

    @abstractmethod
    async def fetch_positions(self) -> List[BrokerPosition]:
        """Fetch current open positions."""
        pass
