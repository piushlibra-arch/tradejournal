from datetime import date
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class AccountType(str, Enum):
    PERSONAL = "personal"
    DEMO = "demo"
    FUNDED = "funded"
    EVALUATION = "evaluation"
    BACKTESTING = "backtesting"
    PAPER = "paper"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    SUSPENDED = "suspended"


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    broker_name: Optional[str] = Field(default=None, max_length=200)
    account_type: AccountType = AccountType.PERSONAL
    currency: str = Field(default="USD", max_length=10)
    initial_balance: Decimal = Field(default=Decimal("0"), ge=0)
    start_date: Optional[date] = None
    account_rules: Optional[Dict[str, Any]] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    broker_name: Optional[str] = Field(default=None, max_length=200)
    account_type: Optional[AccountType] = None
    currency: Optional[str] = Field(default=None, max_length=10)
    initial_balance: Optional[Decimal] = Field(default=None, ge=0)
    start_date: Optional[date] = None
    status: Optional[AccountStatus] = None
    account_rules: Optional[Dict[str, Any]] = None


class AccountResponse(BaseModel):
    id: str
    name: str
    broker_name: Optional[str]
    account_type: str
    currency: str
    initial_balance: str  # String for Decimal representation
    start_date: Optional[date]
    status: str
    account_rules: Optional[Dict[str, Any]]
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
