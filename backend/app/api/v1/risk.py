import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.risk import (
    RiskRuleCreate,
    RiskRuleListResponse,
    RiskRuleResponse,
    RiskRuleUpdate,
    RiskStatusReport,
)
from app.services.risk_service import RiskService

router = APIRouter(prefix="/risk", tags=["Risk Manager"])


@router.get("/status", response_model=RiskStatusReport)
async def get_risk_status(
    account_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Evaluate all active risk rules against real-time executions and current account metrics."""
    return await RiskService.evaluate_risk(db, current_user.id, account_id=account_id)


@router.post("/rules", response_model=RiskRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_risk_rule(
    data: RiskRuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new risk management rule (e.g. max daily loss, max drawdown, max daily trades)."""
    rule = await RiskService.create_rule(db, current_user.id, data)
    return RiskRuleResponse.model_validate(rule)


@router.get("/rules", response_model=RiskRuleListResponse)
async def list_risk_rules(
    account_id: Optional[uuid.UUID] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List configured risk rules for the user."""
    items, total = await RiskService.list_rules(db, current_user.id, account_id=account_id, is_active=is_active)
    return RiskRuleListResponse(
        items=[RiskRuleResponse.model_validate(i) for i in items],
        total=total,
    )


@router.get("/rules/{rule_id}", response_model=RiskRuleResponse)
async def get_risk_rule(
    rule_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific risk rule by ID."""
    rule = await RiskService.get_rule(db, current_user.id, rule_id)
    return RiskRuleResponse.model_validate(rule)


@router.patch("/rules/{rule_id}", response_model=RiskRuleResponse)
async def update_risk_rule(
    rule_id: uuid.UUID,
    data: RiskRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update risk rule thresholds or status."""
    rule = await RiskService.update_rule(db, current_user.id, rule_id, data)
    return RiskRuleResponse.model_validate(rule)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_risk_rule(
    rule_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a risk rule."""
    await RiskService.delete_rule(db, current_user.id, rule_id)
