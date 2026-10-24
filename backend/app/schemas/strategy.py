import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class StrategyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    asset_class: Optional[str] = Field(None, max_length=50)
    status: str = Field("active", max_length=20)
    entry_rules: Optional[Dict[str, Any]] = None
    exit_rules: Optional[Dict[str, Any]] = None


class StrategyCreate(StrategyBase):
    pass


class StrategyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    asset_class: Optional[str] = Field(None, max_length=50)
    status: Optional[str] = Field(None, max_length=20)
    entry_rules: Optional[Dict[str, Any]] = None
    exit_rules: Optional[Dict[str, Any]] = None


class StrategyResponse(StrategyBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StrategyPerformance(BaseModel):
    strategy_id: uuid.UUID
    strategy_name: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    net_pnl: Decimal
    profit_factor: float
    avg_trade_pnl: Decimal


class StrategyListResponse(BaseModel):
    items: List[StrategyResponse]
    total: int
