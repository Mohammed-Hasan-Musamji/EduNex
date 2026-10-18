"""VARK-style questionnaire and learning-plan schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.topic import DifficultyLevel


class QuestionnaireOption(BaseModel):
    id: str
    text: str


class QuestionnaireItem(BaseModel):
    id: str
    prompt: str
    options: list[QuestionnaireOption]


class Questionnaire(BaseModel):
    version: str
    instructions: str
    disclaimer: str
    min_answered: int
    questions: list[QuestionnaireItem]


class VarkSubmission(BaseModel):
    version: str = Field(max_length=20)
    # {question_id: [option ids]}
    responses: dict[str, list[str]] = Field(max_length=50)


class VarkResult(BaseModel):
    id: uuid.UUID
    questionnaire_version: str
    scores: dict[str, int]
    preferred: list[str]
    explanation: str
    created_at: datetime


class PlanActivity(BaseModel):
    format: str
    action: str
    label: str
    modality: str
    preferred: bool


class PlanItem(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    difficulty: DifficultyLevel | None
    recommendation_type: str
    label: str
    reason: str
    activities: list[PlanActivity]


class LearningPlan(BaseModel):
    vark_preferences: list[str]
    vark_source: str | None
    items: list[PlanItem]
    note: str
