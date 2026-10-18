"""Academic content chunk model -- the unit of retrieval for RAG.

The embedding column uses pgvector's `Vector` type on PostgreSQL for real
ANN-ready semantic search. When running against SQLite (used only for the
automated test suite, where PostgreSQL/pgvector are unavailable), it falls
back to a JSON-encoded float array; app/rag/retriever.py detects the active
dialect and performs a brute-force cosine similarity search in that case
instead of a native pgvector query. The JSON fallback is for tests/dev only
and is not a substitute for real pgvector semantic search in production.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import get_settings
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.academic_document import AcademicDocument

_EMBEDDING_DIM = get_settings().gemini_embedding_dimensions


class AcademicContentChunk(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "academic_content_chunks"
    __table_args__ = (
        # HNSW cosine index (PostgreSQL only; created by migration 0004).
        Index(
            "ix_academic_content_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("academic_documents.id", ondelete="CASCADE"), index=True
    )
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_order: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    # PDF page numbers (1-based, as printed by the PDF viewer, not the book's
    # own page labels). Null for text/Markdown documents without page markers.
    page_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    page_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section_title: Mapped[str | None] = mapped_column(String(255), nullable=True)

    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(_EMBEDDING_DIM).with_variant(JSON(), "sqlite"),
        nullable=True,
    )

    document: Mapped[AcademicDocument] = relationship(back_populates="chunks")
