"""Ingestion orchestration: document -> chunks -> embeddings -> pgvector storage.

    Academic document -> text extraction -> chunking -> embedding generation
    -> PostgreSQL/pgvector storage -> (later) semantic retrieval

Text extraction is trivial here because only plain text/Markdown is
accepted (see app/rag/document_loader.py) -- there is no PDF/OCR step.
"""

from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient
from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError
from app.models.academic_document import AcademicDocument, IngestionStatus
from app.models.content_chunk import AcademicContentChunk
from app.rag.chunker import chunk_text
from app.rag.embeddings import embed_chunks


def ingest_document(db: Session, document: AcademicDocument, gemini_client: GeminiClient) -> AcademicDocument:
    """Chunks and embeds `document.raw_text`, replacing any existing chunks.

    On success, sets ingestion_status=indexed. On failure (most commonly:
    Gemini not configured or temporarily unavailable), sets
    ingestion_status=failed with a human-readable failure_detail and leaves
    existing data untouched -- it never claims indexing succeeded when it
    did not.
    """
    settings = get_settings()

    try:
        document.ingestion_status = IngestionStatus.chunking
        db.commit()

        pieces = chunk_text(document.raw_text, chunk_size=settings.rag_chunk_size, overlap=settings.rag_chunk_overlap)
        if not pieces:
            raise ServiceUnavailableError("Document produced no chunks (empty after cleaning).")

        document.ingestion_status = IngestionStatus.embedding
        db.commit()

        vectors = embed_chunks(gemini_client, pieces)

        # Replace prior chunks (e.g. on retry) rather than appending duplicates.
        for existing in list(document.chunks):
            db.delete(existing)
        db.flush()

        for order, (text, vector) in enumerate(zip(pieces, vectors, strict=True)):
            db.add(
                AcademicContentChunk(
                    document_id=document.id,
                    chunk_text=text,
                    chunk_order=order,
                    embedding=vector,
                )
            )

        document.ingestion_status = IngestionStatus.indexed
        document.failure_detail = None
        db.commit()
        db.refresh(document)
        return document

    except Exception as exc:
        db.rollback()
        document.ingestion_status = IngestionStatus.failed
        document.failure_detail = str(exc) if isinstance(exc, ServiceUnavailableError) else "Ingestion failed unexpectedly."
        db.commit()
        db.refresh(document)
        return document
