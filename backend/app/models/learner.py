"""Learner profile model.

Note: learner_id is a development-stage identifier, not an authenticated
session. See app/api/deps.py and the README for the authentication
limitations of this MVP.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.lesson import LessonSession
    from app.models.progress import LearnerProgress
    from app.models.saved_lesson import SavedLesson


class Learner(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "learners"

    display_name: Mapped[str] = mapped_column(String(120), nullable=False)

    # Optional VARK-style preferences and current learning goal, e.g.
    # {"vark_preferences": ["visual", "kinesthetic"], "preferred_detail": "concise",
    #  "learning_goal": "Understand linked lists for an interview"}
    # These are optional preferences the learner can change at any time, not
    # a permanent or scientifically validated classification.
    preferences: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    lesson_sessions: Mapped[list[LessonSession]] = relationship(back_populates="learner")
    progress_records: Mapped[list[LearnerProgress]] = relationship(back_populates="learner")
    saved_lessons: Mapped[list[SavedLesson]] = relationship(back_populates="learner")
