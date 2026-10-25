import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Dict, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.trading_account import TradingAccount
    from app.models.user import User


class BrokerLedgerEntry(Base):
    __tablename__ = "broker_ledger_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trading_accounts.id", ondelete="SET NULL"), nullable=True, index=True
    )

    broker_id: Mapped[str] = mapped_column(String(50), nullable=False, default="dhan", index=True)
    external_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    voucher_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    voucher_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    narration: Mapped[str] = mapped_column(Text, nullable=False)
    exchange: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="NSE")

    debit: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    credit: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    running_balance: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=Decimal("0"))

    reconciled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    raw_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="ledger_entries")
    account: Mapped[Optional["TradingAccount"]] = relationship("TradingAccount")
