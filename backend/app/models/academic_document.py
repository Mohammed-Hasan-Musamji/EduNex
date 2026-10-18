"""Academic document model -- a source document ingested into the knowledge base.

Only plain-text and Markdown ingestion is implemented in this MVP. PDF and
other formats are not supported yet (see app/rag/document_loader.py).
"""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Enum, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.content_chunk import AcademicContentChunk


class DocumentContentType(str, enum.Enum):
    text = "text"
    markdown = "markdown"


class IngestionStatus(str, enum.Enum):
    uploaded = "uploaded"
    chunking = "chunking"
    embedding = "embedding"
    indexed = "indexed"
    failed = "failed"


class AcademicDocument(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "academic_documents"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    source_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # The full original text, preserved so ingestion can be retried/rechunked
    # without the client needing to resend it. Chunk text (see
    # AcademicContentChunk.chunk_text) is derived from this.
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[DocumentContentType] = mapped_column(
        Enum(DocumentContentType, name="document_content_type"), nullable=False
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Chapter-level documents map to one catalog topic (see app/rag/catalog.py).
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("topics.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # SHA-256 of the source bytes (PDF) or text; lets re-ingestion skip
    # unchanged documents and detect edited ones.
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ingestion_status: Mapped[IngestionStatus] = mapped_column(
        Enum(IngestionStatus, name="ingestion_status"), nullable=False, default=IngestionStatus.uploaded
    )
    failure_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Mapped to the DB column "metadata"; the Python attribute is renamed
    # because SQLAlchemy's declarative Base reserves `.metadata`.
    doc_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)

    chunks: Mapped[list[AcademicContentChunk]] = relationship(
        back_populates="document", cascade="all, delete-orphan", order_by="AcademicContentChunk.chunk_order"
    )
