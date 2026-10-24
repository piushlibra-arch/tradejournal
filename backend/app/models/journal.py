import uuid
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class DailyJournalEntry(Base):
    __tablename__ = "daily_journal_entries"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_daily_journal_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    pre_market_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    post_market_review: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lessons_learned: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emotional_state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    discipline_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    market_bias: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    screenshots: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="daily_journal_entries")
