from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationListResponse,
    NotificationResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter()


def _to_response(n: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=str(n.id),
        user_id=str(n.user_id),
        title=n.title,
        message=n.message,
        type=n.type,
        is_read=n.is_read,
        action_url=n.action_url,
        extra_data=n.extra_data,
        created_at=n.created_at.isoformat() if n.created_at else "",
    )


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve notifications for the authenticated user with unread counter."""
    service = NotificationService(db)
    notifications, total, unread_count = await service.list_notifications(
        user_id=current_user.id,
        limit=limit,
        unread_only=unread_only,
    )
    return NotificationListResponse(
        notifications=[_to_response(n) for n in notifications],
        total=total,
        unread_count=unread_count,
    )


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    data: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually create a notification (e.g. from internal events or test probes)."""
    service = NotificationService(db)
    notification = await service.create_notification(current_user.id, data)
    await db.commit()
    return _to_response(notification)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a specific notification as read."""
    service = NotificationService(db)
    notification = await service.mark_as_read(notification_id, current_user.id)
    await db.commit()
    return _to_response(notification)


@router.post("/read-all", response_model=dict)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all unread notifications as read for current user."""
    service = NotificationService(db)
    count = await service.mark_all_as_read(current_user.id)
    await db.commit()
    return {"marked_read": count}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a notification."""
    service = NotificationService(db)
    await service.delete_notification(notification_id, current_user.id)
    await db.commit()
