import math
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.trade import TagSimple, TradeCreate, TradeListResponse, TradeResponse, TradeUpdate
from app.services.trade_service import TradeService

router = APIRouter()


def _trade_to_response(trade) -> TradeResponse:
    tags: List[TagSimple] = []
    if hasattr(trade, "trade_tags") and trade.trade_tags:
        for tt in trade.trade_tags:
            if hasattr(tt, "tag") and tt.tag:
                tags.append(TagSimple(id=str(tt.tag.id), name=tt.tag.name, color=tt.tag.color))

    return TradeResponse(
        id=str(trade.id),
        account_id=str(trade.account_id),
        symbol=trade.symbol,
        asset_class=trade.asset_class,
        direction=str(trade.direction),
        entry_time=trade.entry_time.isoformat(),
        exit_time=trade.exit_time.isoformat() if trade.exit_time else None,
        entry_price=str(trade.entry_price),
        exit_price=str(trade.exit_price) if trade.exit_price is not None else None,
        quantity=str(trade.quantity),
        contract_size=str(trade.contract_size),
        gross_pnl=str(trade.gross_pnl) if trade.gross_pnl is not None else None,
        commission=str(trade.commission),
        fees=str(trade.fees),
        swap=str(trade.swap),
        net_pnl=str(trade.net_pnl) if trade.net_pnl is not None else None,
        stop_loss_price=str(trade.stop_loss_price) if trade.stop_loss_price is not None else None,
        take_profit_price=str(trade.take_profit_price) if trade.take_profit_price is not None else None,
        setup_name=trade.setup_name,
        strategy_id=str(trade.strategy_id) if trade.strategy_id else None,
        trading_session=trade.trading_session,
        market_condition=trade.market_condition,
        emotion_before=trade.emotion_before,
        emotion_during=trade.emotion_during,
        emotion_after=trade.emotion_after,
        followed_plan=trade.followed_plan,
        mistake_classification=trade.mistake_classification,
        notes=trade.notes,
        import_source=trade.import_source,
        external_id=trade.external_id,
        status=str(trade.status),
        tags=tags,
        created_at=trade.created_at.isoformat(),
        updated_at=trade.updated_at.isoformat(),
    )


@router.get("", response_model=TradeListResponse)
async def list_trades(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    account_id: Optional[uuid.UUID] = None,
    symbol: Optional[str] = None,
    direction: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    min_pnl: Optional[Decimal] = None,
    max_pnl: Optional[Decimal] = None,
    setup_name: Optional[str] = None,
    sort_by: str = "entry_time",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TradeService(db)
    trades, total = await service.get_trades(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        account_id=account_id,
        symbol=symbol,
        direction=direction,
        status=status,
        start_date=start_date,
        end_date=end_date,
        min_pnl=min_pnl,
        max_pnl=max_pnl,
        setup_name=setup_name,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return TradeListResponse(
        trades=[_trade_to_response(t) for t in trades],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.post("", response_model=TradeResponse, status_code=201)
async def create_trade(
    data: TradeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TradeService(db)
    trade = await service.create_trade(current_user.id, data)
    return _trade_to_response(trade)


@router.get("/{trade_id}", response_model=TradeResponse)
async def get_trade(
    trade_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TradeService(db)
    trade = await service.get_trade(trade_id, current_user.id)
    return _trade_to_response(trade)


@router.patch("/{trade_id}", response_model=TradeResponse)
async def update_trade(
    trade_id: uuid.UUID,
    data: TradeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TradeService(db)
    trade = await service.update_trade(trade_id, current_user.id, data)
    return _trade_to_response(trade)


@router.delete("/{trade_id}", status_code=204)
async def delete_trade(
    trade_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TradeService(db)
    await service.delete_trade(trade_id, current_user.id)
