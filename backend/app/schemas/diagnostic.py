"""Adaptive skills-diagnostic schemas.

See app/services/diagnostic_service.py for how questions are selected,
how difficulty adapts, and how the summary below is derived. Every number
in DiagnosticSummary comes from server-evaluated attempts in that round.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.assessment import AssessmentRoundStatus
from app.models.topic import DifficultyLevel
from app.schemas.assessment import AttemptResult, QuestionPublic
from app.schemas.gamification import RewardSummary

ConceptStatus = Literal["demonstrated", "developing", "needs_attention", "not_assessed"]


class DiagnosticStart(BaseModel):
    subject_id: uuid.UUID


class DiagnosticAnswer(BaseModel):
    question_id: uuid.UUID
    submitted_answer: int | bool = Field(description="Option index for multiple_choice, boolean for true_false")


class TopicDiagnosis(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    topic_difficulty: DifficultyLevel
    attempted: int
    correct: int
    accuracy: float | None  # 0-100; None when not assessed
    status: ConceptStatus
    limited_evidence: bool


class DifficultyBreakdown(BaseModel):
    difficulty: DifficultyLevel
    attempted: int
    correct: int


class DiagnosticCoverage(BaseModel):
    questions_answered: int
    topics_assessed: int
    topics_total: int
    limited_evidence: bool
    note: str


class DiagnosticRecommendation(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    difficulty: DifficultyLevel
    activity: Literal["lesson", "practice"]
    reason: str


class DiagnosticSummary(BaseModel):
    subject_id: uuid.UUID
    subject_name: str
    overall_score: float
    correct: int
    total: int
    topics: list[TopicDiagnosis]
    prerequisite_gaps: list[uuid.UUID]
    prerequisite_rule: str
    by_difficulty: list[DifficultyBreakdown]
    recommended_difficulty: DifficultyLevel
    recommended_difficulty_reason: str
    recommendation: DiagnosticRecommendation | None
    coverage: DiagnosticCoverage


class DiagnosticState(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: str
    status: AssessmentRoundStatus
    answered_count: int
    correct_count: int
    max_questions: int
    current_difficulty: DifficultyLevel | None
    question: QuestionPublic | None
    question_topic_name: str | None
    summary: DiagnosticSummary | None
    created_at: datetime
    completed_at: datetime | None


class DiagnosticAnswerResult(BaseModel):
    attempt: AttemptResult
    state: DiagnosticState
    rewards: RewardSummary | None


class DiagnosticListItem(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: str
    status: AssessmentRoundStatus
    score: float | None
    answered_count: int
    created_at: datetime
    completed_at: datetime | None
