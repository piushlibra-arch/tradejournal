import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.core.exceptions import NotFoundError
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate
from app.services.notification_service import NotificationService


@pytest.mark.asyncio
async def test_create_and_read_notification():
    user_id = uuid.uuid4()
    mock_db = AsyncMock()

    service = NotificationService(mock_db)
    payload = NotificationCreate(
        title="Dhan Sync Complete",
        message="8 trades synchronized successfully.",
        type="success",
        action_url="/journal",
    )

    # Test create
    notification = await service.create_notification(user_id, payload)
    assert notification.user_id == user_id
    assert notification.title == "Dhan Sync Complete"
    assert notification.is_read is False
    assert mock_db.add.called
    assert mock_db.flush.called


@pytest.mark.asyncio
async def test_list_notifications_unread_count():
    user_id = uuid.uuid4()
    mock_db = AsyncMock()

    # Mock execute result
    mock_res_list = MagicMock()
    n1 = Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        title="Alert",
        message="Risk limit",
        type="warning",
        is_read=False,
    )
    mock_res_list.scalars.return_value.all.return_value = [n1]

    mock_total = MagicMock()
    mock_total.scalar_one.return_value = 5

    mock_unread = MagicMock()
    mock_unread.scalar_one.return_value = 2

    mock_db.execute.side_effect = [mock_res_list, mock_total, mock_unread]

    service = NotificationService(mock_db)
    items, total, unread = await service.list_notifications(user_id=user_id, unread_only=False)

    assert len(items) == 1
    assert total == 5
    assert unread == 2


@pytest.mark.asyncio
async def test_mark_as_read_not_found():
    user_id = uuid.uuid4()
    mock_db = AsyncMock()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    service = NotificationService(mock_db)
    with pytest.raises(NotFoundError):
        await service.mark_as_read(uuid.uuid4(), user_id)
