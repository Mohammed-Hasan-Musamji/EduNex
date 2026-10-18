"""Assessment question and attempt models.

Correctness is always determined on the server by comparing a submitted
answer against `correct_answer`, which is never serialized to clients
before they submit an attempt.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.topic import DifficultyLevel

if TYPE_CHECKING:
    from app.models.content_chunk import AcademicContentChunk
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
    # "seeded" is retained for historical rows but never served to learners;
    # generated items must trace to a source chunk.
    origin: Mapped[str] = mapped_column(String(20), nullable=False, default="seeded")
    # Generated items start "unreviewed"; only reviewed/approved items should
    # be presented as vetted curriculum.
    review_status: Mapped[str] = mapped_column(String(20), nullable=False, default="approved")
    source_chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("academic_content_chunks.id", ondelete="SET NULL"), nullable=True
    )

    topic: Mapped[Topic] = relationship()
    attempts: Mapped[list[AssessmentAttempt]] = relationship(back_populates="question")
    source_chunk: Mapped[AcademicContentChunk | None] = relationship()

    @property
    def source_page(self) -> int | None:
        return self.source_chunk.page_start if self.source_chunk else None

    @property
    def source_title(self) -> str | None:
        return self.source_chunk.document.title if self.source_chunk and self.source_chunk.document else None


class AssessmentRoundKind(str, enum.Enum):
    practice = "practice"
    diagnostic = "diagnostic"


class AssessmentRoundStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"


class AssessmentRound(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One submitted practice round, or one (possibly still in-progress)
    adaptive diagnostic. Groups the AssessmentAttempt rows it produced so
    scores, trends, and rewards are computed from a single stored unit
    rather than reconstructed from loose attempts.

    Practice rounds are submitted in one request and are idempotent on
    `client_request_id`. Diagnostics are answered one question at a time;
    `pending_question_id` is the only question the server will accept next,
    so a client cannot pick its own (easier) questions.
    """

    __tablename__ = "assessment_rounds"
    __table_args__ = (
        UniqueConstraint("learner_id", "client_request_id", name="uq_assessment_rounds_learner_id_client_request_id"),
    )

    learner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    kind: Mapped[AssessmentRoundKind] = mapped_column(Enum(AssessmentRoundKind, name="assessment_round_kind"), nullable=False)
    status: Mapped[AssessmentRoundStatus] = mapped_column(
        Enum(AssessmentRoundStatus, name="assessment_round_status"), nullable=False
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    topic_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    client_request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Diagnostic-only adaptive state.
    current_difficulty: Mapped[DifficultyLevel | None] = mapped_column(
        Enum(DifficultyLevel, name="difficulty_level"), nullable=True
    )
    pending_question_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("assessment_questions.id", ondelete="SET NULL"), nullable=True
    )
    served_question_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    max_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    correct_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0.0-100.0 once completed
    # Diagnostic results (see app/schemas/diagnostic.py DiagnosticSummary).
    summary: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    attempts: Mapped[list[AssessmentAttempt]] = relationship(back_populates="round", order_by="AssessmentAttempt.created_at")


class AssessmentAttempt(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "assessment_attempts"

    learner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("assessment_questions.id", ondelete="CASCADE"), index=True
    )

    # Null for attempts submitted individually via POST /assessments/attempts.
    round_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("assessment_rounds.id", ondelete="CASCADE"), index=True, nullable=True
    )

    submitted_answer: Mapped[Any] = mapped_column(JSON, nullable=False)
    is_correct: Mapped[bool] = mapped_column(nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0-100.0
    feedback: Mapped[str] = mapped_column(Text, nullable=False, default="")

    learner: Mapped[Learner] = relationship()
    question: Mapped[AssessmentQuestion] = relationship(back_populates="attempts")
    round: Mapped[AssessmentRound | None] = relationship(back_populates="attempts")
