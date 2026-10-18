<<<<<<< HEAD
"""Metadata-aware document -> page-aware chunks -> embeddings -> vector storage."""
from __future__ import annotations
import re
=======
"""Document -> page-aware chunks -> embeddings -> pgvector storage.

Chunking (`build_chunks`):
- Text is split into paragraphs within each PDF page (`[[PAGE:n]]` markers
  from app/rag/textbook_metadata.py; plain-text documents are one "page").
- Paragraphs are packed into chunks of up to RAG_CHUNK_SIZE characters. A
  short heading-like line is never left as the last line of a chunk -- it
  moves to the next chunk with the paragraph it introduces.
- RAG_CHUNK_OVERLAP characters (cut at a word boundary) carry over between
  consecutive chunks.
- Each chunk records the real PDF page range it came from and, when the PDF
  has an outline, the section that range falls in.

Ingestion (`ingest_document`) is all-or-nothing per document: chunks are
embedded first; only if every embedding succeeds are the old chunks
replaced and the document marked `indexed`, in one commit. Any failure sets
`failed` with a specific reason and leaves previously indexed chunks as
they were.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

>>>>>>> b5abe61 (Implemented 3)
from sqlalchemy.orm import Session
from app.ai.gemini_client import GeminiClient
from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError
from app.models.academic_document import AcademicDocument, IngestionStatus
from app.models.content_chunk import AcademicContentChunk
from app.rag.embeddings import embed_chunks
from app.rag.textbook_metadata import PAGE_MARKER

<<<<<<< HEAD

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
=======
HEADING_MAX_CHARS = 70
MIN_CHUNK_LETTERS = 30
_NUMBERED_HEADING = re.compile(r"^(\d+(\.\d+)*\.?\s+\S|chapter\b|section\b|appendix\b)", re.I)


@dataclass
class ChunkDraft:
    text: str
    page_start: int | None
    page_end: int | None
    section_title: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


def _page_blocks(raw_text: str) -> list[tuple[int | None, str]]:
    matches = list(PAGE_MARKER.finditer(raw_text))
    if not matches:
        return [(None, raw_text.strip())] if raw_text.strip() else []
    blocks: list[tuple[int | None, str]] = []
    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw_text)
        body = raw_text[match.end() : end].strip()
        if body:
            blocks.append((int(match.group(1)), body))
    return blocks


def _paragraphs(page_text: str) -> list[str]:
    """Splits on blank lines; single newlines inside a paragraph become spaces,
    except that a short line standing alone stays its own (heading) paragraph."""
    paragraphs: list[str] = []
    for block in re.split(r"\n\s*\n", page_text):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue
        if len(lines) > 1 and _is_heading(lines[0]):
            paragraphs.append(lines[0])
            lines = lines[1:]
        paragraphs.append(_join_lines(lines))
    return paragraphs


def _join_lines(lines: list[str]) -> str:
    """Joins wrapped lines, re-joining words hyphenated across a line break."""
    out = ""
    for line in lines:
        if out.endswith("-") and line[:1].islower():
            out = out[:-1] + line
        else:
            out = f"{out} {line}" if out else line
    return re.sub(r"\s+", " ", out)


def _is_heading(line: str) -> bool:
    """Numbered/"Chapter" lines, ALL-CAPS lines, or short Title Case lines --
    not merely short lines, since PDF text wraps every ~70 characters."""
    line = line.strip()
    if not line or len(line) > HEADING_MAX_CHARS or line.endswith((".", ",", ";", ":", "-")):
        return False
    if not any(c.isalpha() for c in line):
        return False
    if _NUMBERED_HEADING.match(line) or (line.isupper() and len(line) > 3):
        return True
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z'-]*", line) if len(w) > 3]
    return bool(words) and len(line.split()) <= 10 and sum(w[0].isupper() for w in words) / len(words) >= 0.8


def _split_long(paragraph: str, size: int) -> list[str]:
    if len(paragraph) <= size:
        return [paragraph]
    parts: list[str] = []
    current = ""
    for sentence in re.split(r"(?<=[.!?])\s+", paragraph):
        while len(sentence) > size:  # a single run-on "sentence": cut at a word boundary
            cut = sentence.rfind(" ", 0, size)
            cut = cut if cut > 0 else size
            if current:
                parts.append(current)
                current = ""
            parts.append(sentence[:cut].strip())
            sentence = sentence[cut:].strip()
        if current and len(current) + 1 + len(sentence) > size:
            parts.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        parts.append(current)
    return [p for p in parts if p]


def _overlap_tail(text: str, overlap: int) -> str:
    if overlap <= 0 or len(text) <= overlap:
        return ""
    tail = text[-overlap:]
    space = tail.find(" ")
    return tail[space + 1 :] if space != -1 else tail


def _section_for(page: int | None, sections: list[dict[str, Any]]) -> str | None:
    if page is None:
        return None
    current = None
    for section in sorted(sections, key=lambda s: s.get("start_pdf_page") or 0):
        start = section.get("start_pdf_page")
        if isinstance(start, int) and start <= page:
            current = section.get("title")
        elif isinstance(start, int) and start > page:
            break
    return current[:255] if current else None


def build_chunks(raw_text: str, *, chunk_size: int, overlap: int, sections: list[dict[str, Any]] | None = None) -> list[ChunkDraft]:
    if chunk_size <= 0 or overlap < 0 or overlap >= chunk_size:
        raise ValueError("chunk_size must be positive and overlap in [0, chunk_size)")
    sections = sections or []
    pieces: list[tuple[int | None, str]] = []
    for page, page_text in _page_blocks(raw_text):
        for paragraph in _paragraphs(page_text):
            pieces.extend((page, part) for part in _split_long(paragraph, chunk_size - overlap))

    chunks: list[ChunkDraft] = []
    lines: list[str] = []
    pages: list[int | None] = []

    def flush(carry_heading: bool) -> None:
        nonlocal lines, pages
        held: list[tuple[int | None, str]] = []
        if carry_heading:
            # Never end a chunk on a heading: move it to the next chunk.
            while len(lines) > 1 and _is_heading(lines[-1]):
                held.insert(0, (pages.pop(), lines.pop()))
        text = "\n".join(lines).strip()
        if sum(c.isalpha() for c in text) >= MIN_CHUNK_LETTERS:
            known = [p for p in pages if p is not None]
            start, end = (min(known), max(known)) if known else (None, None)
            chunks.append(ChunkDraft(text=text, page_start=start, page_end=end, section_title=_section_for(start, sections)))
        tail = _overlap_tail(text, overlap)
        lines = [tail] if tail else []
        pages = [pages[-1]] if tail and pages else []
        for page, line in held:
            lines.append(line)
            pages.append(page)

    for page, piece in pieces:
        current_len = sum(len(line) + 1 for line in lines)
        if lines and current_len + len(piece) > chunk_size:
            flush(carry_heading=True)
        lines.append(piece)
        pages.append(page)
    flush(carry_heading=False)
    return chunks


def embedding_input(chunk: ChunkDraft, document: AcademicDocument) -> str:
    """Prefixes the chunk with where it comes from, so similar wording in
    different subjects/chapters embeds differently. The stored chunk_text
    stays the raw passage."""
    meta = document.doc_metadata or {}
    context = " | ".join(
        part for part in (meta.get("subject"), meta.get("chapter_title") or document.title, chunk.section_title) if part
    )
    return f"{context}\n{chunk.text}" if context else chunk.text
>>>>>>> b5abe61 (Implemented 3)


def ingest_document(db: Session, document: AcademicDocument, gemini_client: GeminiClient) -> AcademicDocument:
    settings = get_settings()
<<<<<<< HEAD
=======
    meta = document.doc_metadata or {}
>>>>>>> b5abe61 (Implemented 3)
    try:
        document.ingestion_status = IngestionStatus.chunking
        document.failure_detail = None
        db.commit()
<<<<<<< HEAD
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
=======

        drafts = build_chunks(
            document.raw_text,
            chunk_size=settings.rag_chunk_size,
            overlap=settings.rag_chunk_overlap,
            sections=meta.get("sections") or [],
        )
        if not drafts:
            raise ServiceUnavailableError("Document produced no chunks (no selectable text after extraction).")

        document.ingestion_status = IngestionStatus.embedding
        db.commit()
        vectors = embed_chunks(gemini_client, [embedding_input(d, document) for d in drafts])

        for existing in list(document.chunks):
            db.delete(existing)
        db.flush()
        for order, (draft, vector) in enumerate(zip(drafts, vectors, strict=True)):
            db.add(
                AcademicContentChunk(
                    document_id=document.id,
                    chunk_text=draft.text,
                    chunk_order=order,
                    page_start=draft.page_start,
                    page_end=draft.page_end,
                    section_title=draft.section_title,
                    chunk_metadata={
                        "subject": meta.get("subject"),
                        "chapter_title": meta.get("chapter_title") or document.title,
                        "chapter_number": meta.get("chapter_number"),
                        "source_file": document.source_name,
                    },
                    embedding=vector,
                )
            )
>>>>>>> b5abe61 (Implemented 3)
        document.ingestion_status = IngestionStatus.indexed
        document.failure_detail = None
        db.commit(); db.refresh(document)
        return document
    except Exception as exc:
        db.rollback()
        document = db.get(AcademicDocument, document.id)
<<<<<<< HEAD
        if document is not None:
            document.ingestion_status = IngestionStatus.failed
            document.failure_detail = str(exc) if isinstance(exc, ServiceUnavailableError) else f"Ingestion failed: {type(exc).__name__}."
            db.commit(); db.refresh(document)
            return document
        raise
=======
        if document is None:
            raise
        document.ingestion_status = IngestionStatus.failed
        document.failure_detail = (
            exc.message if isinstance(exc, ServiceUnavailableError) else f"Ingestion failed: {type(exc).__name__}."
        )[:2000]
        db.commit()
        db.refresh(document)
        return document
>>>>>>> b5abe61 (Implemented 3)
