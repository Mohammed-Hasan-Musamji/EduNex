"""Subject and topic read schemas."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, Field

from app.models.topic import DifficultyLevel
from app.schemas.common import ORMModel


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)


class SubjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    is_active: bool | None = None


class TopicRead(ORMModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    name: str
    slug: str
    description: str
    difficulty: DifficultyLevel


class SubjectRead(ORMModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str
    is_active: bool


class SubjectDetail(SubjectRead):
    topics: list[TopicRead] = []
