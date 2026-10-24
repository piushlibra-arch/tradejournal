import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.engine import AnalyticsEngine
from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.trade import Trade
from app.models.trading_account import TradingAccount
from app.models.user import User

router = APIRouter()


async def _fetch_filtered_trades(
    db: AsyncSession,
    user_id: uuid.UUID,
    account_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Trade]:
    query = select(Trade).where(Trade.user_id == user_id)
    filters = []
    if account_id:
        filters.append(Trade.account_id == account_id)
    if start_date:
        filters.append(Trade.entry_time >= start_date)
    if end_date:
        filters.append(Trade.entry_time <= end_date)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/summary")
async def get_dashboard_summary(
    account_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await _fetch_filtered_trades(db, current_user.id, account_id, start_date, end_date)
    initial_balance = Decimal("0")
    if account_id:
        acc_res = await db.execute(select(TradingAccount).where(TradingAccount.id == account_id))
        acc = acc_res.scalar_one_or_none()
        if acc:
            initial_balance = acc.initial_balance

    return AnalyticsEngine.calculate_kpis(trades, initial_balance)


@router.get("/equity-curve")
async def get_dashboard_equity_curve(
    account_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await _fetch_filtered_trades(db, current_user.id, account_id, start_date, end_date)
    initial_balance = Decimal("0")
    if account_id:
        acc_res = await db.execute(select(TradingAccount).where(TradingAccount.id == account_id))
        acc = acc_res.scalar_one_or_none()
        if acc:
            initial_balance = acc.initial_balance

    return AnalyticsEngine.calculate_equity_curve(trades, initial_balance)


@router.get("/daily-pnl")
async def get_dashboard_daily_pnl(
    account_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await _fetch_filtered_trades(db, current_user.id, account_id, start_date, end_date)
    return AnalyticsEngine.calculate_daily_pnl(trades)
