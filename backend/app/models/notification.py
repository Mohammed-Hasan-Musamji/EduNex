"""Persistent in-app notifications.

Only created by server-side events that actually happened (an achievement
earned, a level reached, diagnostic results ready, a streak milestone) --
never to fill the panel. `dedupe_key` (unique per recipient) keeps a retried
event from notifying twice. Delivery outside the app (browser push, email)
is not implemented; these are read through GET /api/v1/notifications.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base, UUIDPrimaryKeyMixin


class NotificationType(str, enum.Enum):
    achievement_earned = "achievement_earned"
    level_up = "level_up"
    streak_milestone = "streak_milestone"
    diagnostic_results = "diagnostic_results"
    concept_mastered = "concept_mastered"


class Notification(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (UniqueConstraint("recipient_id", "dedupe_key", name="uq_notifications_recipient_id_dedupe_key"),)

    recipient_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # e.g. ("assessment_round", <id>) so the UI can link to the resource.
    resource_type: Mapped[str | None] = mapped_column(String(60), nullable=True)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    dedupe_key: Mapped[str] = mapped_column(String(200), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False, index=True)
