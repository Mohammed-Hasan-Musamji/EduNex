"""Textbook question-answering (RAG tutor) schemas.

`sources` only ever contains chunks that retrieval actually returned *and*
the model cited; their titles, subjects, chapters, and page numbers come
from the database, never from model output.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class TutorAskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    subject_id: uuid.UUID | None = None
    document_id: uuid.UUID | None = None
    top_k: int | None = Field(default=None, ge=1, le=10)

    @field_validator("question")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Question must contain at least 3 non-space characters.")
        return value


class TutorSource(BaseModel):
    ref: int  # the [n] marker used in the answer text
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    title: str
    subject_id: uuid.UUID | None
    subject: str | None
    chapter: str | None
    section: str | None
    source_file: str | None
    page_start: int | None
    page_end: int | None
    similarity: float
    excerpt: str


class RetrievalInfo(BaseModel):
    retrieved: int
    top_similarity: float | None
    min_similarity: float
    subject_id: uuid.UUID | None
    document_id: uuid.UUID | None


class PersonalizationInfo(BaseModel):
    vark_preferences: list[str]
    explanation: str


class TutorAnswer(BaseModel):
    interaction_id: uuid.UUID
    answer: str
    grounded: bool
    support: Literal["supported", "partial", "not_found"]
    sources: list[TutorSource]
    retrieval: RetrievalInfo
    personalization: PersonalizationInfo
    created_at: datetime


class TutorHistoryItem(BaseModel):
    id: uuid.UUID
    question: str
    answer: str
    grounded: bool
    subject_id: uuid.UUID | None
    cited_chunk_ids: list[str]
    created_at: datetime
