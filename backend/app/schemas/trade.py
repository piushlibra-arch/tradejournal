from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class TradeDirection(str, Enum):
    LONG = "long"
    SHORT = "short"


class TradeStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class TradeCreate(BaseModel):
    account_id: str
    symbol: str = Field(min_length=1, max_length=50)
    asset_class: Optional[str] = Field(default=None, max_length=50)
    direction: TradeDirection
    entry_time: datetime
    exit_time: Optional[datetime] = None
    entry_price: Decimal = Field(gt=0)
    exit_price: Optional[Decimal] = Field(default=None, gt=0)
    quantity: Decimal = Field(gt=0)
    contract_size: Decimal = Field(default=Decimal("1"), gt=0)
    gross_pnl: Optional[Decimal] = None
    commission: Decimal = Field(default=Decimal("0"), ge=0)
    fees: Decimal = Field(default=Decimal("0"), ge=0)
    swap: Decimal = Field(default=Decimal("0"))
    net_pnl: Optional[Decimal] = None
    stop_loss_price: Optional[Decimal] = Field(default=None, gt=0)
    take_profit_price: Optional[Decimal] = Field(default=None, gt=0)
    setup_name: Optional[str] = None
    strategy_id: Optional[str] = None
    trading_session: Optional[str] = None
    market_condition: Optional[str] = None
    emotion_before: Optional[str] = None
    emotion_during: Optional[str] = None
    emotion_after: Optional[str] = None
    followed_plan: Optional[bool] = None
    mistake_classification: Optional[str] = None
    notes: Optional[str] = None
    status: TradeStatus = TradeStatus.CLOSED
    tag_ids: Optional[List[str]] = None


class TradeUpdate(BaseModel):
    symbol: Optional[str] = Field(default=None, min_length=1, max_length=50)
    asset_class: Optional[str] = Field(default=None, max_length=50)
    direction: Optional[TradeDirection] = None
    entry_time: Optional[datetime] = None
    exit_time: Optional[datetime] = None
    entry_price: Optional[Decimal] = Field(default=None, gt=0)
    exit_price: Optional[Decimal] = Field(default=None, gt=0)
    quantity: Optional[Decimal] = Field(default=None, gt=0)
    contract_size: Optional[Decimal] = Field(default=None, gt=0)
    gross_pnl: Optional[Decimal] = None
    commission: Optional[Decimal] = Field(default=None, ge=0)
    fees: Optional[Decimal] = Field(default=None, ge=0)
    swap: Optional[Decimal] = None
    net_pnl: Optional[Decimal] = None
    stop_loss_price: Optional[Decimal] = Field(default=None, gt=0)
    take_profit_price: Optional[Decimal] = Field(default=None, gt=0)
    setup_name: Optional[str] = None
    strategy_id: Optional[str] = None
    trading_session: Optional[str] = None
    market_condition: Optional[str] = None
    emotion_before: Optional[str] = None
    emotion_during: Optional[str] = None
    emotion_after: Optional[str] = None
    followed_plan: Optional[bool] = None
    mistake_classification: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[TradeStatus] = None
    tag_ids: Optional[List[str]] = None


class TagSimple(BaseModel):
    id: str
    name: str
    color: Optional[str] = None


class TradeResponse(BaseModel):
    id: str
    account_id: str
    symbol: str
    asset_class: Optional[str] = None
    direction: str
    entry_time: str
    exit_time: Optional[str] = None
    entry_price: str
    exit_price: Optional[str] = None
    quantity: str
    contract_size: str
    gross_pnl: Optional[str] = None
    commission: str
    fees: str
    swap: str
    net_pnl: Optional[str] = None
    stop_loss_price: Optional[str] = None
    take_profit_price: Optional[str] = None
    setup_name: Optional[str] = None
    strategy_id: Optional[str] = None
    trading_session: Optional[str] = None
    market_condition: Optional[str] = None
    emotion_before: Optional[str] = None
    emotion_during: Optional[str] = None
    emotion_after: Optional[str] = None
    followed_plan: Optional[bool] = None
    mistake_classification: Optional[str] = None
    notes: Optional[str] = None
    import_source: Optional[str] = None
    external_id: Optional[str] = None
    status: str
    tags: List[TagSimple] = []
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class TradeListResponse(BaseModel):
    trades: List[TradeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
