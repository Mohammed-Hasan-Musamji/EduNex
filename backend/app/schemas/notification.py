"""In-app notification schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.notification import NotificationType
from app.schemas.common import ORMModel


class NotificationRead(ORMModel):
    id: uuid.UUID
    notification_type: NotificationType
    title: str
    body: str
    resource_type: str | None
    resource_id: uuid.UUID | None
    is_read: bool
    read_at: datetime | None
    created_at: datetime


class NotificationList(BaseModel):
    items: list[NotificationRead]
    unread_count: int
