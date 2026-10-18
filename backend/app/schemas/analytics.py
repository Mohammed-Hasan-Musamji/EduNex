"""Learner progress analytics (My Progress page).

Each field is derived from persisted rows -- assessment rounds/attempts,
lesson sessions, learner_progress, and the learning-event ledger. Learning
*time* is deliberately absent: the app does not track active time
reliably, so it reports none rather than estimating.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.models.assessment import AssessmentRoundKind
from app.models.topic import DifficultyLevel

TopicStatus = Literal["mastered", "developing", "needs_attention", "not_started"]


class AnalyticsSummary(BaseModel):
    lessons_completed: int
    lessons_generated: int
    assessments_completed: int
    questions_answered: int
    overall_accuracy: float | None  # 0-100, None until something is answered
    concepts_mastered: int
    concepts_needing_attention: int
    current_streak: int
    xp_total: int
    level: int


class ScorePoint(BaseModel):
    round_id: uuid.UUID
    kind: AssessmentRoundKind
    label: str
    score: float
    correct: int
    total: int
    completed_at: datetime


class DailyActivity(BaseModel):
    date: date
    questions_answered: int
    correct: int
    lessons_completed: int


class TopicMastery(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    subject_name: str
    difficulty: DifficultyLevel
    mastery: float | None
    attempts: int
    correct: int
    status: TopicStatus
    last_activity_at: datetime | None


class DifficultyStat(BaseModel):
    difficulty: DifficultyLevel
    attempts: int
    correct: int


class MasteryPolicy(BaseModel):
    mastered_threshold: float
    needs_attention_threshold: float
    min_attempts: int


class LearnerAnalytics(BaseModel):
    summary: AnalyticsSummary
    score_trend: list[ScorePoint]
    daily_activity: list[DailyActivity]
    topic_mastery: list[TopicMastery]
    difficulty_breakdown: list[DifficultyStat]
    mastery_policy: MasteryPolicy
    activity_timezone: str
