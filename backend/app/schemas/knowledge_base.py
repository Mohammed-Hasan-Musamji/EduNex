"""Knowledge-base (academic document ingestion + retrieval) schemas.

These admin endpoints are development-only: there is no authentication or
authorization on them in this MVP. See README.md "Known limitations".
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.academic_document import DocumentContentType, IngestionStatus


class DocumentTextCreate(BaseModel):
    """Text-ingestion request body. Only plain text/Markdown is supported --
    there is no file-path handling at all, which also means there is no
    path-traversal surface for this endpoint."""

    title: str = Field(min_length=1, max_length=255)
    source_name: str | None = Field(default=None, max_length=255)
    content_type: Literal["text", "markdown"] = "text"
    subject_id: uuid.UUID | None = None
    text: str = Field(min_length=1, max_length=200_000)


class DocumentRead(BaseModel):
    id: uuid.UUID
    title: str
    source_name: str | None
    content_type: DocumentContentType
    subject_id: uuid.UUID | None
    ingestion_status: IngestionStatus
    failure_detail: str | None
    chunk_count: int
    created_at: datetime
    updated_at: datetime


class IngestResponse(BaseModel):
    document_id: uuid.UUID
    ingestion_status: IngestionStatus
    chunk_count: int
    failure_detail: str | None = None


class KnowledgeBaseSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    top_k: int | None = Field(default=None, ge=1, le=20)


class SearchResult(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    excerpt: str
    similarity_score: float


class KnowledgeBaseSearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    warning: str | None = None
