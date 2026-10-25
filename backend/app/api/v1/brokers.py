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
    BrokerConnectPayload,
    BrokerConnectionResponse,
    BrokerProviderInfo,
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
    broker_id: str = Query("dhan", description="Broker identifier to synchronize"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Synchronize trade history from the connected broker into MyTradeJournal."""
    service = BrokerSyncService(db)
    result = await service.sync_trades(user_id=current_user.id, broker_id=broker_id)
    await db.commit()
    return BrokerSyncResponse(**result)


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
