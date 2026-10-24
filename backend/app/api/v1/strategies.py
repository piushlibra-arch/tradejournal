import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.strategy import (
    StrategyCreate,
    StrategyListResponse,
    StrategyPerformance,
    StrategyResponse,
    StrategyUpdate,
)
from app.services.strategy_service import StrategyService

router = APIRouter(prefix="/strategies", tags=["Strategies"])


@router.post("", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
async def create_strategy(
    data: StrategyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new trading strategy / setup playbook definition."""
    strategy = await StrategyService.create_strategy(db, current_user.id, data)
    return StrategyResponse.model_validate(strategy)


@router.get("", response_model=StrategyListResponse)
async def list_strategies(
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all strategies defined by the user."""
    items, total = await StrategyService.list_strategies(db, current_user.id, status=status, limit=limit, offset=offset)
    return StrategyListResponse(
        items=[StrategyResponse.model_validate(i) for i in items],
        total=total,
    )


@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(
    strategy_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a strategy by ID."""
    strategy = await StrategyService.get_strategy(db, current_user.id, strategy_id)
    return StrategyResponse.model_validate(strategy)


@router.patch("/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: uuid.UUID,
    data: StrategyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update strategy rules and configuration."""
    strategy = await StrategyService.update_strategy(db, current_user.id, strategy_id, data)
    return StrategyResponse.model_validate(strategy)


@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_strategy(
    strategy_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a strategy."""
    await StrategyService.delete_strategy(db, current_user.id, strategy_id)


@router.get("/{strategy_id}/performance", response_model=StrategyPerformance)
async def get_strategy_performance(
    strategy_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compute realized performance and statistics for trades linked to this strategy."""
    return await StrategyService.get_strategy_performance(db, current_user.id, strategy_id)
