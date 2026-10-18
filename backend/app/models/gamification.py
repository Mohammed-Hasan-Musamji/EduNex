"""Learning-event ledger, achievement definitions, and earned achievements.

`LearningEvent` is the single source of truth for XP, streaks, and the
progress timeline. Each row records one verified, server-observed learning
event (never a client claim), and the unique (learner_id, event_key)
constraint makes awarding idempotent: retrying the same lesson completion
or round submission can never award XP twice. The rules that decide which
events exist and what they are worth live in
app/services/gamification_service.py.
"""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Date, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class LearningEventType(str, enum.Enum):
    lesson_completed = "lesson_completed"
    practice_round_submitted = "practice_round_submitted"
    diagnostic_completed = "diagnostic_completed"
    improvement_demonstrated = "improvement_demonstrated"
    concept_mastered = "concept_mastered"
    achievement_earned = "achievement_earned"


class LearningEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "learning_events"
    __table_args__ = (UniqueConstraint("learner_id", "event_key", name="uq_learning_events_learner_id_event_key"),)

    learner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[LearningEventType] = mapped_column(Enum(LearningEventType, name="learning_event_type"), nullable=False)
    # Stable idempotency key derived from the underlying resource, e.g.
    # "lesson:<lesson_session_id>" or "round:<round_id>".
    event_key: Mapped[str] = mapped_column(String(200), nullable=False)
    xp_awarded: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Calendar date of the event in the configured activity timezone
    # (Settings.activity_timezone) -- what streaks are computed from.
    activity_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    resource_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    # {"title": ..., "description": ..., plus event-specific fields}, written
    # once at creation so the timeline shows what was true at the time.
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)


class AchievementDefinition(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """What an achievement is and the measurable criterion that earns it.
    Every `criteria_type` here must be implemented in
    gamification_service._achievement_metrics -- an unknown type is never
    shown as an earnable goal."""

    __tablename__ = "achievement_definitions"

    code: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    criteria_type: Mapped[str] = mapped_column(String(60), nullable=False)
    threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    xp_reward: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class LearnerAchievement(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "learner_achievements"
    __table_args__ = (
        UniqueConstraint("learner_id", "achievement_id", name="uq_learner_achievements_learner_id_achievement_id"),
    )

    learner_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    achievement_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("achievement_definitions.id", ondelete="CASCADE"), index=True
    )
    earned_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    achievement: Mapped[AchievementDefinition] = relationship()
