"""Learner progress model -- one row per (learner, topic) pair.

Mastery is a simple explainable heuristic (see
app/services/recommendation_service.py), not a scientifically validated
cognitive model.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Integer, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.learner import Learner
    from app.models.topic import Topic


class LearnerProgress(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "learner_progress"
    __table_args__ = (UniqueConstraint("learner_id", "topic_id", name="uq_learner_progress_learner_id_topic_id"),)

    learner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    topic_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("topics.id", ondelete="CASCADE"), index=True)

    mastery_estimate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # 0.0-100.0
    attempts_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_activity_at: Mapped[datetime | None] = mapped_column(nullable=True)

    learner: Mapped[Learner] = relationship(back_populates="progress_records")
    topic: Mapped[Topic] = relationship()
