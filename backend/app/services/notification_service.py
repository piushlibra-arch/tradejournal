from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_notification(
        self,
        user_id: uuid.UUID,
        data: NotificationCreate,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            title=data.title,
            message=data.message,
            type=data.type,
            action_url=data.action_url,
            extra_data=data.extra_data,
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(notification)
        await self.db.flush()
        await self.db.refresh(notification)
        return notification

    async def list_notifications(
        self,
        user_id: uuid.UUID,
        limit: int = 50,
        unread_only: bool = False,
    ) -> tuple[List[Notification], int, int]:
        query = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            query = query.where(Notification.is_read.is_(False))

        query = query.order_by(Notification.created_at.desc()).limit(limit)
        result = await self.db.execute(query)
        notifications = list(result.scalars().all())

        # Total count
        total_q = select(func.count(Notification.id)).where(Notification.user_id == user_id)
        total_res = await self.db.execute(total_q)
        total = total_res.scalar_one()

        # Unread count
        unread_q = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        unread_res = await self.db.execute(unread_q)
        unread_count = unread_res.scalar_one()

        return notifications, total, unread_count

    async def mark_as_read(
        self,
        notification_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Notification:
        stmt = (
            update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(is_read=True)
            .returning(Notification)
        )
        result = await self.db.execute(stmt)
        notification = result.scalar_one_or_none()
        if not notification:
            raise NotFoundError("Notification")
        return notification

    async def mark_all_as_read(self, user_id: uuid.UUID) -> int:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True)
        )
        result = await self.db.execute(stmt)
        return result.rowcount or 0

    async def delete_notification(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> None:
        stmt = delete(Notification).where(
            Notification.id == notification_id, Notification.user_id == user_id
        )
        result = await self.db.execute(stmt)
        if (result.rowcount or 0) == 0:
            raise NotFoundError("Notification")
