"""Metadata-aware document -> page-aware chunks -> embeddings -> vector storage."""
from __future__ import annotations
import re
from sqlalchemy.orm import Session
from app.ai.gemini_client import GeminiClient
from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError
from app.models.academic_document import AcademicDocument, IngestionStatus
from app.models.content_chunk import AcademicContentChunk
from app.rag.embeddings import embed_chunks
from app.rag.textbook_metadata import PAGE_MARKER


def _page_blocks(raw_text: str) -> list[tuple[int, str]]:
    matches = list(PAGE_MARKER.finditer(raw_text))
    if not matches:
        return [(1, raw_text.strip())] if raw_text.strip() else []
    blocks: list[tuple[int, str]] = []
    for i, match in enumerate(matches):
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw_text)
        text = raw_text[start:end].strip()
        if text:
            blocks.append((int(match.group(1)), text))
    return blocks


def _metadata_chunks(document: AcademicDocument, chunk_size: int, overlap: int) -> list[tuple[str, dict]]:
    """Build chunks without losing PDF page range; page numbers are PDF pages."""
    pages = _page_blocks(document.raw_text)
    if not pages:
        return []
    doc_meta = document.doc_metadata or {}
    result: list[tuple[str, dict]] = []
    current: list[str] = []
    current_chars = 0
    start_page = pages[0][0]
    end_page = start_page
    for page_no, page_text in pages:
        # Split oversized pages at word boundaries, preserving page number.
        words = page_text.split()
        page_parts: list[str] = []
        part: list[str] = []
        size = 0
        for word in words:
            projected = size + len(word) + (1 if part else 0)
            if projected > chunk_size and part:
                page_parts.append(" ".join(part)); part = []; size = 0
            part.append(word); size += len(word) + (1 if len(part) > 1 else 0)
        if part:
            page_parts.append(" ".join(part))
        for part_text in page_parts:
            if current and current_chars + len(part_text) + 1 > chunk_size:
                result.append(("\n".join(current), {
                    "subject": doc_meta.get("subject"), "chapter_title": doc_meta.get("chapter_title", document.title),
                    "chapter_number": doc_meta.get("chapter_number"), "page_start": start_page,
                    "page_end": end_page, "topics": doc_meta.get("topics", []),
                    "source_file": document.source_name,
                }))
                # Word overlap is an approximation; keep the last overlap characters.
                tail = "\n".join(current)[-overlap:] if overlap else ""
                current = [tail] if tail.strip() else []
                current_chars = len(tail) if tail.strip() else 0
                start_page = page_no
            if not current:
                start_page = page_no
            current.append(part_text)
            current_chars += len(part_text) + 1
            end_page = page_no
    if current:
        result.append(("\n".join(current), {
            "subject": doc_meta.get("subject"), "chapter_title": doc_meta.get("chapter_title", document.title),
            "chapter_number": doc_meta.get("chapter_number"), "page_start": start_page,
            "page_end": end_page, "topics": doc_meta.get("topics", []),
            "source_file": document.source_name,
        }))
    return [(text, meta) for text, meta in result if text.strip()]


def ingest_document(db: Session, document: AcademicDocument, gemini_client: GeminiClient) -> AcademicDocument:
    settings = get_settings()
    try:
        document.ingestion_status = IngestionStatus.chunking
        db.commit()
        pieces = _metadata_chunks(document, settings.rag_chunk_size, settings.rag_chunk_overlap)
        if not pieces:
            raise ServiceUnavailableError("Document produced no chunks (empty after extraction).")
        document.ingestion_status = IngestionStatus.embedding
        db.commit()
        vectors = embed_chunks(gemini_client, [text for text, _ in pieces])
        for existing in list(document.chunks):
            db.delete(existing)
        db.flush()
        for order, ((text, metadata), vector) in enumerate(zip(pieces, vectors, strict=True)):
            db.add(AcademicContentChunk(document_id=document.id, chunk_text=text,
                                        chunk_order=order, chunk_metadata=metadata, embedding=vector))
        document.ingestion_status = IngestionStatus.indexed
        document.failure_detail = None
        db.commit(); db.refresh(document)
        return document
    except Exception as exc:
        db.rollback()
        document = db.get(AcademicDocument, document.id)
        if document is not None:
            document.ingestion_status = IngestionStatus.failed
            document.failure_detail = str(exc) if isinstance(exc, ServiceUnavailableError) else f"Ingestion failed: {type(exc).__name__}."
            db.commit(); db.refresh(document)
            return document
        raise
