"""Semantic retrieval over indexed academic content chunks.

On PostgreSQL, this issues a real pgvector cosine-similarity query (an
IVFFlat-accelerated `<=>` operator comparison via SQLAlchemy's
`cosine_distance`). When running against SQLite (the automated test suite
only -- PostgreSQL/pgvector were unavailable in this development
environment), it falls back to a brute-force Python cosine similarity over
every embedded chunk. The fallback is for tests/dev only and is explicitly
not a claim that pgvector-backed search has been verified end-to-end.
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.academic_document import AcademicDocument
from app.models.content_chunk import AcademicContentChunk


@dataclass
class RetrievedChunk:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    chunk_text: str
    similarity_score: float


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
) -> list[RetrievedChunk]:
    settings = get_settings()
    top_k = top_k or settings.rag_top_k
    min_similarity = settings.rag_min_similarity if min_similarity is None else min_similarity

    if db.bind is not None and db.bind.dialect.name == "postgresql":
        return _retrieve_pgvector(db, query_embedding, top_k=top_k, min_similarity=min_similarity)
    return _retrieve_brute_force(db, query_embedding, top_k=top_k, min_similarity=min_similarity)


def _retrieve_pgvector(
    db: Session, query_embedding: list[float], *, top_k: int, min_similarity: float
) -> list[RetrievedChunk]:
    distance = AcademicContentChunk.embedding.cosine_distance(query_embedding)
    stmt = (
        select(AcademicContentChunk, AcademicDocument.title, distance.label("distance"))
        .join(AcademicDocument, AcademicContentChunk.document_id == AcademicDocument.id)
        .where(AcademicContentChunk.embedding.is_not(None))
        .order_by(distance)
        .limit(top_k)
    )
    results = []
    for chunk, document_title, distance_value in db.execute(stmt).all():
        similarity = 1.0 - float(distance_value)
        if similarity < min_similarity:
            continue
        results.append(
            RetrievedChunk(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                document_title=document_title,
                chunk_text=chunk.chunk_text,
                similarity_score=round(similarity, 4),
            )
        )
    return results


def _retrieve_brute_force(
    db: Session, query_embedding: list[float], *, top_k: int, min_similarity: float
) -> list[RetrievedChunk]:
    stmt = (
        select(AcademicContentChunk, AcademicDocument.title)
        .join(AcademicDocument, AcademicContentChunk.document_id == AcademicDocument.id)
        .where(AcademicContentChunk.embedding.is_not(None))
    )
    scored: list[RetrievedChunk] = []
    for chunk, document_title in db.execute(stmt).all():
        similarity = _cosine_similarity(query_embedding, list(chunk.embedding))
        if similarity < min_similarity:
            continue
        scored.append(
            RetrievedChunk(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                document_title=document_title,
                chunk_text=chunk.chunk_text,
                similarity_score=round(similarity, 4),
            )
        )
    scored.sort(key=lambda r: r.similarity_score, reverse=True)
    return scored[:top_k]
