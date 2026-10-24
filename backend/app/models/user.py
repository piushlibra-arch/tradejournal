import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.journal import DailyJournalEntry
    from app.models.risk_rule import RiskRule
    from app.models.strategy import Strategy
    from app.models.tag import Tag
    from app.models.trade import Trade
    from app.models.trading_account import TradingAccount


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    trading_accounts: Mapped[List["TradingAccount"]] = relationship("TradingAccount", back_populates="user", cascade="all, delete-orphan", lazy="selectin")
    trades: Mapped[List["Trade"]] = relationship("Trade", back_populates="user", cascade="all, delete-orphan")
    strategies: Mapped[List["Strategy"]] = relationship("Strategy", back_populates="user", cascade="all, delete-orphan")
    tags: Mapped[List["Tag"]] = relationship("Tag", back_populates="user", cascade="all, delete-orphan")
    daily_journal_entries: Mapped[List["DailyJournalEntry"]] = relationship("DailyJournalEntry", back_populates="user", cascade="all, delete-orphan")
    risk_rules: Mapped[List["RiskRule"]] = relationship("RiskRule", back_populates="user", cascade="all, delete-orphan")
