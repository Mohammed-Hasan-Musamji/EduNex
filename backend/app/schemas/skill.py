"""Skill-profile schemas (see app/services/skill_service.py for definitions)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models.topic import DifficultyLevel
from app.schemas.common import ORMModel

EvidenceLevel = Literal["none", "low", "medium", "high"]


class Misconception(BaseModel):
    question_id: uuid.UUID
    question_text: str
    times_missed: int
    explanation: str


class TopicSkill(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    subject_id: uuid.UUID
    subject_name: str
    difficulty: DifficultyLevel
    attempts: int
    correct: int
    measured_accuracy: float | None
    estimated_mastery: float
    uncertainty: float
    evidence_level: EvidenceLevel
    last_assessed_at: datetime | None
    change_since_first_snapshot: float | None
    misconceptions: list[Misconception]


class SkillProfile(BaseModel):
    method: str
    topics: list[TopicSkill]


class SkillSnapshotRead(ORMModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    round_id: uuid.UUID | None
    measured_accuracy: float | None
    estimated_mastery: float
    attempts: int
    correct: int
    evidence_level: EvidenceLevel
    created_at: datetime
