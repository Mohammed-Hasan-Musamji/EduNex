"""Semantic retrieval over indexed academic content chunks.

On PostgreSQL this calls the `match_academic_chunks` SQL function (migration
0004): an HNSW-indexed pgvector cosine search restricted to documents whose
ingestion finished (`indexed`), optionally filtered by subject and/or
document. The same function can be called through Supabase RPC.

On SQLite (the automated test suite only) it runs a brute-force cosine
similarity in Python with identical filters and thresholds, so the tests
exercise the same semantics without pgvector.
"""

from __future__ import annotations

import json
import math
import uuid
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.academic_document import AcademicDocument, IngestionStatus
from app.models.content_chunk import AcademicContentChunk

MAX_TOP_K = 20


@dataclass
class RetrievedChunk:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    chunk_text: str
    similarity_score: float
    subject_id: uuid.UUID | None = None
    source_name: str | None = None
    chunk_order: int = 0
    page_start: int | None = None
    page_end: int | None = None
    section_title: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def retrieve(
    db: Session,
    query_embedding: list[float],
    *,
    top_k: int | None = None,
    min_similarity: float | None = None,
    subject_id: uuid.UUID | None = None,
    document_id: uuid.UUID | None = None,
) -> list[RetrievedChunk]:
    settings = get_settings()
    top_k = max(1, min(MAX_TOP_K, top_k or settings.rag_top_k))
    min_similarity = settings.rag_min_similarity if min_similarity is None else min_similarity

    if db.bind is not None and db.bind.dialect.name == "postgresql":
        return _retrieve_pgvector(db, query_embedding, top_k, min_similarity, subject_id, document_id)
    return _retrieve_brute_force(db, query_embedding, top_k, min_similarity, subject_id, document_id)


def _retrieve_pgvector(
    db: Session,
    query_embedding: list[float],
    top_k: int,
    min_similarity: float,
    subject_id: uuid.UUID | None,
    document_id: uuid.UUID | None,
) -> list[RetrievedChunk]:
    rows = db.execute(
        text(
            "SELECT * FROM match_academic_chunks(CAST(:embedding AS vector), :top_k, :min_similarity, "
            "CAST(:subject_id AS uuid), CAST(:document_id AS uuid))"
        ),
        {
            "embedding": json.dumps(query_embedding),
            "top_k": top_k,
            "min_similarity": min_similarity,
            "subject_id": str(subject_id) if subject_id else None,
            "document_id": str(document_id) if document_id else None,
        },
    ).mappings()
    return [
        RetrievedChunk(
            chunk_id=row["chunk_id"],
            document_id=row["document_id"],
            document_title=row["document_title"],
            chunk_text=row["chunk_text"],
            similarity_score=round(float(row["similarity"]), 4),
            subject_id=row["subject_id"],
            source_name=row["source_name"],
            chunk_order=row["chunk_order"],
            page_start=row["page_start"],
            page_end=row["page_end"],
            section_title=row["section_title"],
        )
        for row in rows
    ]


def _retrieve_brute_force(
    db: Session,
    query_embedding: list[float],
    top_k: int,
    min_similarity: float,
    subject_id: uuid.UUID | None,
    document_id: uuid.UUID | None,
) -> list[RetrievedChunk]:
    stmt = (
        select(AcademicContentChunk, AcademicDocument)
        .join(AcademicDocument, AcademicContentChunk.document_id == AcademicDocument.id)
        .where(AcademicContentChunk.embedding.is_not(None), AcademicDocument.ingestion_status == IngestionStatus.indexed)
    )
    if subject_id is not None:
        stmt = stmt.where(AcademicDocument.subject_id == subject_id)
    if document_id is not None:
        stmt = stmt.where(AcademicContentChunk.document_id == document_id)

    scored: list[RetrievedChunk] = []
    for chunk, document in db.execute(stmt).all():
        similarity = _cosine_similarity(query_embedding, list(chunk.embedding))
        if similarity < min_similarity:
            continue
        scored.append(
            RetrievedChunk(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                document_title=document.title,
                chunk_text=chunk.chunk_text,
                similarity_score=round(similarity, 4),
                subject_id=document.subject_id,
                source_name=document.source_name,
                chunk_order=chunk.chunk_order,
                page_start=chunk.page_start,
                page_end=chunk.page_end,
                section_title=chunk.section_title,
                metadata=chunk.chunk_metadata or {},
            )
        )
    scored.sort(key=lambda r: r.similarity_score, reverse=True)
    return scored[:top_k]


