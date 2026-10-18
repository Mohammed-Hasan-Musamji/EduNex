"""Skill snapshots, VARK questionnaire results, and tutor interaction history.

- SkillSnapshot: one row per (learner, topic) each time a completed round or
  diagnostic changes the evidence for that topic -- so the skill profile can
  be compared over time instead of only showing the latest number.
- VarkAssessment: a scored, versioned questionnaire submission. VARK is an
  optional presentation preference, not a diagnosis of ability.
- TutorInteraction: an audit trail of textbook questions and the grounded
  answer returned, including which retrieved chunks were cited.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base, UUIDPrimaryKeyMixin


class SkillSnapshot(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "skill_snapshots"

    learner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    topic_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("topics.id", ondelete="CASCADE"), index=True)
    round_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("assessment_rounds.id", ondelete="SET NULL"), nullable=True
    )
    # Accuracy in the round that produced this snapshot (what was measured).
    measured_accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Cumulative estimate after this round (see app/services/skill_service.py).
    estimated_mastery: Mapped[float] = mapped_column(Float, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False)
    correct: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_level: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False, index=True)


class VarkAssessment(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "vark_assessments"

    learner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    questionnaire_version: Mapped[str] = mapped_column(String(20), nullable=False)
    # {question_id: [selected option ids]}
    responses: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    # {"visual": n, "auditory": n, "read_write": n, "kinesthetic": n}
    scores: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    preferred: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)


class TutorInteraction(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "tutor_interactions"

    learner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    grounded: Mapped[bool] = mapped_column(Boolean, nullable=False)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("academic_documents.id", ondelete="SET NULL"), nullable=True
    )
    cited_chunk_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    # {"retrieved": n, "top_similarity": x, "min_similarity": y, "model": "..."}
    retrieval: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False, index=True)
