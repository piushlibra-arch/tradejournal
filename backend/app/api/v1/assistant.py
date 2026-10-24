from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.assistant_service import TradingAssistantService

router = APIRouter(prefix="/assistant", tags=["AI Trading Assistant"])


class AssistantQueryRequest(BaseModel):
    query: Optional[str] = None


@router.post("/query", response_model=Dict[str, Any])
async def query_trading_assistant(
    req: AssistantQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query the AI trading assistant for data-grounded performance insights."""
    return await TradingAssistantService.analyze_trader_performance(db, current_user.id, user_query=req.query)


@router.get("/insights", response_model=Dict[str, Any])
async def get_trading_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve automatic trader diagnostics and behavioral leaks."""
    return await TradingAssistantService.analyze_trader_performance(db, current_user.id)
