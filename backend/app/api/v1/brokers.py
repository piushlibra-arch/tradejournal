from datetime import datetime
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.brokers.registry import SUPPORTED_BROKERS
from app.db.session import get_db
from app.models.broker_connection import BrokerConnection
from app.models.user import User
from app.schemas.broker import (
    BrokerChargesSummaryResponse,
    BrokerConnectPayload,
    BrokerConnectionResponse,
    BrokerLedgerSummaryResponse,
    BrokerProviderInfo,
    BrokerSyncPayload,
    BrokerSyncResponse,
)
from app.services.broker_sync_service import BrokerSyncService

router = APIRouter()


@router.get("/providers", response_model=List[BrokerProviderInfo])
async def list_supported_providers():
    """List all supported broker integrations and their capabilities."""
    return [BrokerProviderInfo(**b) for b in SUPPORTED_BROKERS]


@router.get("/connections", response_model=List[BrokerConnectionResponse])
async def list_user_broker_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve active broker connections for the current user (secrets are redacted)."""
    stmt = select(BrokerConnection).where(
        BrokerConnection.user_id == current_user.id,
        BrokerConnection.is_active.is_(True),
    )
    res = await db.execute(stmt)
    connections = res.scalars().all()

    return [
        BrokerConnectionResponse(
            id=str(c.id),
            broker_id=c.broker_id,
            client_id=c.client_id,
            account_id=str(c.account_id) if c.account_id else None,
            is_active=c.is_active,
            sync_status=c.sync_status,
            last_sync_at=c.last_sync_at.isoformat() if c.last_sync_at else None,
            last_error=c.last_error,
            created_at=c.created_at.isoformat() if c.created_at else "",
        )
        for c in connections
    ]


@router.post("/connect", status_code=status.HTTP_200_OK)
async def connect_broker_account(
    payload: BrokerConnectPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Test credentials against official broker API, encrypt credentials, and save connection."""
    service = BrokerSyncService(db)
    result = await service.connect_broker(
        user_id=current_user.id,
        broker_id=payload.broker_id,
        client_id=payload.client_id,
        access_token=payload.access_token,
        account_id=payload.account_id,
    )
    await db.commit()
    return result


@router.post("/sync", response_model=BrokerSyncResponse)
async def sync_broker_trades(
    payload: Optional[BrokerSyncPayload] = None,
    broker_id: Optional[str] = Query(None, description="Broker identifier to synchronize"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Synchronize trade history and ledger from the connected broker into MyTradeJournal."""
    service = BrokerSyncService(db)
    
    # Resolve parameters from payload or query param fallback
    target_broker = (payload.broker_id if payload else broker_id) or "dhan"
    from_date_dt: Optional[datetime] = None
    to_date_dt: Optional[datetime] = None
    sync_ledger = True

    if payload:
        sync_ledger = payload.sync_ledger
        if payload.from_date:
            try:
                from_date_dt = datetime.fromisoformat(payload.from_date)
            except Exception:
                pass
        if payload.to_date:
            try:
                to_date_dt = datetime.fromisoformat(payload.to_date)
            except Exception:
                pass

    result = await service.sync_trades(
        user_id=current_user.id,
        broker_id=target_broker,
        from_date=from_date_dt,
        to_date=to_date_dt,
        sync_ledger=sync_ledger,
    )
    await db.commit()
    return BrokerSyncResponse(**result)


@router.get("/ledger", response_model=BrokerLedgerSummaryResponse)
async def get_broker_ledger(
    broker_id: str = Query("dhan", description="Broker identifier"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve imported broker ledger entries and debit/credit reconciliation totals."""
    from_dt: Optional[datetime] = None
    to_dt: Optional[datetime] = None
    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date)
        except Exception:
            pass
    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date)
        except Exception:
            pass

    service = BrokerSyncService(db)
    result = await service.get_ledger_entries(
        user_id=current_user.id,
        broker_id=broker_id,
        from_date=from_dt,
        to_date=to_dt,
        limit=limit,
        offset=offset,
    )
    return BrokerLedgerSummaryResponse(**result)


@router.get("/charges-summary", response_model=BrokerChargesSummaryResponse)
async def get_broker_charges_summary(
    broker_id: str = Query("dhan", description="Broker identifier"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve itemized charge totals (Brokerage, STT, Exchange, GST, Stamp Duty, SEBI) and provenance stats."""
    from_dt: Optional[datetime] = None
    to_dt: Optional[datetime] = None
    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date)
        except Exception:
            pass
    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date)
        except Exception:
            pass

    service = BrokerSyncService(db)
    result = await service.get_charges_summary(
        user_id=current_user.id,
        broker_id=broker_id,
        from_date=from_dt,
        to_date=to_dt,
    )
    return BrokerChargesSummaryResponse(**result)


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_broker(
    connection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect and deactivate a broker integration."""
    stmt = select(BrokerConnection).where(
        BrokerConnection.id == connection_id,
        BrokerConnection.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    conn = res.scalar_one_or_none()
    if conn:
        conn.is_active = False
        conn.sync_status = "idle"
        await db.commit()
