import uuid
from datetime import date
from typing import List, Optional, Tuple

from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.journal import DailyJournalEntry
from app.schemas.journal import JournalEntryCreate


class JournalService:
    @staticmethod
    async def get_by_date(
        db: AsyncSession,
        user_id: uuid.UUID,
        entry_date: date,
    ) -> Optional[DailyJournalEntry]:
        stmt = select(DailyJournalEntry).where(
            and_(
                DailyJournalEntry.user_id == user_id,
                DailyJournalEntry.date == entry_date,
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def upsert(
        db: AsyncSession,
        user_id: uuid.UUID,
        data: JournalEntryCreate,
    ) -> DailyJournalEntry:
        existing = await JournalService.get_by_date(db, user_id, data.date)
        if existing:
            existing.pre_market_plan = data.pre_market_plan
            existing.post_market_review = data.post_market_review
            existing.lessons_learned = data.lessons_learned
            existing.emotional_state = data.emotional_state
            existing.discipline_score = data.discipline_score
            existing.market_bias = data.market_bias
            existing.screenshots = data.screenshots
            await db.commit()
            await db.refresh(existing)
            return existing
        else:
            entry = DailyJournalEntry(
                user_id=user_id,
                date=data.date,
                pre_market_plan=data.pre_market_plan,
                post_market_review=data.post_market_review,
                lessons_learned=data.lessons_learned,
                emotional_state=data.emotional_state,
                discipline_score=data.discipline_score,
                market_bias=data.market_bias,
                screenshots=data.screenshots,
            )
            db.add(entry)
            await db.commit()
            await db.refresh(entry)
            return entry

    @staticmethod
    async def list_entries(
        db: AsyncSession,
        user_id: uuid.UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[DailyJournalEntry], int]:
        filters = [DailyJournalEntry.user_id == user_id]
        if start_date:
            filters.append(DailyJournalEntry.date >= start_date)
        if end_date:
            filters.append(DailyJournalEntry.date <= end_date)

        stmt = select(DailyJournalEntry).where(and_(*filters)).order_by(DailyJournalEntry.date.desc()).limit(limit).offset(offset)
        result = await db.execute(stmt)
        items = list(result.scalars().all())

        count_stmt = select(DailyJournalEntry.id).where(and_(*filters))
        count_res = await db.execute(count_stmt)
        total = len(count_res.scalars().all())

        return items, total

    @staticmethod
    async def delete_by_date(
        db: AsyncSession,
        user_id: uuid.UUID,
        entry_date: date,
    ) -> None:
        entry = await JournalService.get_by_date(db, user_id, entry_date)
        if not entry:
            raise NotFoundError(f"Journal entry for date {entry_date} not found")

        stmt = delete(DailyJournalEntry).where(
            and_(
                DailyJournalEntry.user_id == user_id,
                DailyJournalEntry.date == entry_date,
            )
        )
        await db.execute(stmt)
        await db.commit()
