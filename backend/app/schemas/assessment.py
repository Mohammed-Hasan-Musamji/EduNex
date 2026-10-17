"""Assessment question and attempt schemas.

QuestionPublic deliberately omits the correct answer and explanation so the
frontend cannot read them before a learner submits an attempt.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.assessment import QuestionType
from app.models.topic import DifficultyLevel
from app.schemas.common import ORMModel


class QuestionPublic(ORMModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    question_text: str
    question_type: QuestionType
    options: list[str] | None
    difficulty: DifficultyLevel


class AttemptCreate(BaseModel):
    learner_id: uuid.UUID
    question_id: uuid.UUID
    # Multiple-choice: option index. True/false: boolean. Validated against
    # the question's actual type on the server in assessment_service.
    submitted_answer: int | bool = Field(description="Option index for multiple_choice, boolean for true_false")


class AttemptResult(BaseModel):
    attempt_id: uuid.UUID
    question_id: uuid.UUID
    is_correct: bool
    score: float
    feedback: str
    explanation: str
    created_at: datetime


class AttemptRead(ORMModel):
    id: uuid.UUID
    learner_id: uuid.UUID
    question_id: uuid.UUID
    submitted_answer: int | bool
    is_correct: bool
    score: float
    feedback: str
    created_at: datetime
