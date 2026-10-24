from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models.user import User
from app.schemas.journal import JournalEntryCreate, JournalEntryListResponse, JournalEntryResponse
from app.services.journal_service import JournalService

router = APIRouter(prefix="/journal", tags=["Daily Journal"])


@router.get("", response_model=JournalEntryListResponse)
async def list_journal_entries(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List daily journal entries for the current user within an optional date range."""
    items, total = await JournalService.list_entries(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )
    return JournalEntryListResponse(
        items=[JournalEntryResponse.model_validate(i) for i in items],
        total=total,
    )


@router.get("/{entry_date}", response_model=JournalEntryResponse)
async def get_journal_entry(
    entry_date: date,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the daily journal entry for a specific date."""
    entry = await JournalService.get_by_date(db, current_user.id, entry_date)
    if not entry:
        raise NotFoundError(f"Journal entry for {entry_date} not found")
    return JournalEntryResponse.model_validate(entry)


@router.post("", response_model=JournalEntryResponse, status_code=status.HTTP_200_OK)
async def upsert_journal_entry(
    data: JournalEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update a daily journal entry for a given date."""
    entry = await JournalService.upsert(db, current_user.id, data)
    return JournalEntryResponse.model_validate(entry)


@router.delete("/{entry_date}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journal_entry(
    entry_date: date,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a daily journal entry for a specific date."""
    await JournalService.delete_by_date(db, current_user.id, entry_date)
