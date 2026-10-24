import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class RiskRuleBase(BaseModel):
    rule_type: str = Field(..., max_length=50)  # max_daily_loss, max_trades_per_day, max_drawdown, max_position_size, max_loss_per_trade
    threshold: Decimal = Field(..., gt=0)
    action: str = Field("warn", max_length=20)
    is_active: bool = True
    account_id: Optional[uuid.UUID] = None


class RiskRuleCreate(RiskRuleBase):
    pass


class RiskRuleUpdate(BaseModel):
    rule_type: Optional[str] = Field(None, max_length=50)
    threshold: Optional[Decimal] = Field(None, gt=0)
    action: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    account_id: Optional[uuid.UUID] = None


class RiskRuleResponse(RiskRuleBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RiskRuleListResponse(BaseModel):
    items: List[RiskRuleResponse]
    total: int


class RiskEvaluationItem(BaseModel):
    rule_id: uuid.UUID
    rule_type: str
    threshold: Decimal
    current_value: Decimal
    status: str  # "safe", "warning", "breached"
    message: str
    account_id: Optional[uuid.UUID] = None


class RiskStatusReport(BaseModel):
    overall_status: str  # "safe", "warning", "breached"
    evaluations: List[RiskEvaluationItem]
    rules_checked: int
    breaches_count: int
    warnings_count: int
