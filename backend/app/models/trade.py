import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.execution import Execution
    from app.models.strategy import Strategy
    from app.models.tag import TradeTag
    from app.models.trading_account import TradingAccount
    from app.models.user import User


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trading_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    strategy_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("strategies.id", ondelete="SET NULL"), nullable=True, index=True)

    # Instrument
    symbol: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    asset_class: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Direction and timing
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # 'long' or 'short'
    entry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    exit_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Prices and sizes
    entry_price: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    exit_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    contract_size: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("1"))

    # P&L and costs
    gross_pnl: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    commission: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    fees: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    swap: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    net_pnl: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True, index=True)

    # Risk management
    stop_loss_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    take_profit_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)

    # Classification
    setup_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    trading_session: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    market_condition: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Psychology
    emotion_before: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    emotion_during: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    emotion_after: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    followed_plan: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    mistake_classification: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Import tracking
    import_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    external_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    charges_breakdown: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    charge_provenance: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="unavailable")

    # Status: open, closed, cancelled
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="closed", index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="trades")
    account: Mapped["TradingAccount"] = relationship("TradingAccount", back_populates="trades")
    strategy: Mapped[Optional["Strategy"]] = relationship("Strategy", back_populates="trades")
    executions: Mapped[List["Execution"]] = relationship("Execution", back_populates="trade", cascade="all, delete-orphan", lazy="selectin")
    trade_tags: Mapped[List["TradeTag"]] = relationship("TradeTag", back_populates="trade", cascade="all, delete-orphan", lazy="selectin")
