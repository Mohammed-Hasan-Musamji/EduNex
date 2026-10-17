"""Assessment question and attempt models.

Correctness is always determined on the server by comparing a submitted
answer against `correct_answer`, which is never serialized to clients
before they submit an attempt.
"""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Enum, Float, ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.topic import DifficultyLevel

if TYPE_CHECKING:
    from app.models.learner import Learner
    from app.models.topic import Topic


class QuestionType(str, enum.Enum):
    multiple_choice = "multiple_choice"
    true_false = "true_false"


class AssessmentQuestion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "assessment_questions"

    topic_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("topics.id", ondelete="CASCADE"), index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(Enum(QuestionType, name="question_type"), nullable=False)

    # For multiple_choice: list[str] of options. Null for true_false.
    options: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    # Server-only ground truth: int option index for multiple_choice, bool for true_false.
    # Never included in the public question-listing response schema.
    correct_answer: Mapped[Any] = mapped_column(JSON, nullable=False)

    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    difficulty: Mapped[DifficultyLevel] = mapped_column(
        Enum(DifficultyLevel, name="difficulty_level"), nullable=False, default=DifficultyLevel.beginner
    )

    topic: Mapped[Topic] = relationship()
    attempts: Mapped[list[AssessmentAttempt]] = relationship(back_populates="question")


class AssessmentAttempt(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "assessment_attempts"

    learner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("assessment_questions.id", ondelete="CASCADE"), index=True
    )

    submitted_answer: Mapped[Any] = mapped_column(JSON, nullable=False)
    is_correct: Mapped[bool] = mapped_column(nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0-100.0
    feedback: Mapped[str] = mapped_column(Text, nullable=False, default="")

    learner: Mapped[Learner] = relationship()
    question: Mapped[AssessmentQuestion] = relationship(back_populates="attempts")
