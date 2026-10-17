"""Learner profile and account model.

A Learner row IS the account -- email + hashed_password authenticate it,
and `role` distinguishes an ordinary learner from an authorized admin. See
app/core/security.py for hashing/session logic and app/api/deps.py for the
dependencies that authenticate a request and enforce ownership/role checks.
"""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.lesson import LessonSession
    from app.models.progress import LearnerProgress
    from app.models.saved_lesson import SavedLesson


class LearnerRole(str, enum.Enum):
    learner = "learner"
    admin = "admin"


class Learner(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "learners"

    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[LearnerRole] = mapped_column(Enum(LearnerRole, name="learner_role"), nullable=False, default=LearnerRole.learner)

    # Optional VARK-style preferences and current learning goal, e.g.
    # {"vark_preferences": ["visual", "kinesthetic"], "preferred_detail": "concise",
    #  "learning_goal": "Understand linked lists for an interview"}
    # These are optional preferences the learner can change at any time, not
    # a permanent or scientifically validated classification.
    preferences: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    lesson_sessions: Mapped[list[LessonSession]] = relationship(back_populates="learner")
    progress_records: Mapped[list[LearnerProgress]] = relationship(back_populates="learner")
    saved_lessons: Mapped[list[SavedLesson]] = relationship(back_populates="learner")
