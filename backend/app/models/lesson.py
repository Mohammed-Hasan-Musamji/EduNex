"""Lesson session model.

A lesson session captures one learner's request for a lesson on a topic,
plus the generated structured lesson content once Gemini has produced it.
Storing this in Postgres (rather than relying on Gemini's own memory) is
what allows a session to be resumed later.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Enum, ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.learner import Learner
    from app.models.saved_lesson import SavedLesson
    from app.models.topic import Topic


class LessonSessionStatus(str, enum.Enum):
    generating = "generating"
    ready = "ready"
    failed = "failed"


class LessonSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "lesson_sessions"

    learner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    topic_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("topics.id", ondelete="CASCADE"), index=True)

    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    vark_preferences: Mapped[list[str]] = mapped_column(JSON, default=list)

    status: Mapped[LessonSessionStatus] = mapped_column(
        Enum(LessonSessionStatus, name="lesson_session_status"),
        nullable=False,
        default=LessonSessionStatus.generating,
    )

    # The validated, schema-conformant lesson payload (see app/schemas/lesson.py).
    lesson_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    # List of {"chunk_id": ..., "document_title": ..., "excerpt": ...} actually retrieved from the KB.
    source_references: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Set once, by POST /lessons/{id}/complete -- generation alone is not completion.
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    learner: Mapped[Learner] = relationship(back_populates="lesson_sessions")
    topic: Mapped[Topic] = relationship()
    saved_by: Mapped[list[SavedLesson]] = relationship(back_populates="lesson_session")
