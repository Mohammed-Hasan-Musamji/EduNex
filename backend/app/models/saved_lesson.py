"""Saved (bookmarked) lesson model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.learner import Learner
    from app.models.lesson import LessonSession


class SavedLesson(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "saved_lessons"
    __table_args__ = (
        UniqueConstraint("learner_id", "lesson_session_id", name="uq_saved_lessons_learner_id_lesson_session_id"),
    )

    learner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    lesson_session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("lesson_sessions.id", ondelete="CASCADE"), index=True
    )
    saved_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    learner: Mapped[Learner] = relationship(back_populates="saved_lessons")
    lesson_session: Mapped[LessonSession] = relationship(back_populates="saved_by")
