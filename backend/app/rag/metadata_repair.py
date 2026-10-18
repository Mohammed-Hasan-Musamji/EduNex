"""Repair document metadata after a failed AI inference -- without re-ingesting.

Only metadata changes. Chunks, their text, their order, their page ranges,
and their embeddings are never deleted, re-created, or re-embedded:
- academic_documents.doc_metadata / title are updated;
- the chapter Topic's display name/description are updated (its slug and id
  stay the same, so links and progress keep working);
- each chunk's `metadata` JSON gets the new chapter title/number.

Embeddings were computed with the fallback chapter title in their context
prefix (see app/rag/ingestion.embedding_input). They stay valid -- the
passage text dominates the vector -- and are deliberately left alone; a
full re-embed is only a `--force` re-ingestion away if ever wanted.

The source PDF must still match the stored content hash; if it changed,
this refuses and the document should be re-ingested instead.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient
from app.models.academic_document import AcademicDocument, IngestionStatus
from app.models.content_chunk import AcademicContentChunk
from app.models.topic import Topic
from app.rag.textbook_metadata import extract_pdf_document, infer_metadata, needs_metadata_repair

PRESERVED_KEYS = ("source_relative_path", "pdf_page_count", "pages_needing_ocr", "blank_pages", "metadata_pipeline_version")


@dataclass
class RepairOutcome:
    document_id: str
    source: str
    status: str  # "repaired" | "still_failing" | "skipped" | "source_changed" | "missing_source"
    detail: str = ""


def repair_document_metadata(db: Session, document: AcademicDocument, client: GeminiClient, root: Path) -> RepairOutcome:
    source = document.source_name or ""
    if not needs_metadata_repair(document.doc_metadata):
        return RepairOutcome(str(document.id), source, "skipped", "metadata does not need repair")
    if document.ingestion_status != IngestionStatus.indexed:
        return RepairOutcome(str(document.id), source, "skipped", f"document is {document.ingestion_status.value}; re-ingest it instead")
    pdf = root / source
    if not pdf.is_file():
        return RepairOutcome(str(document.id), source, "missing_source", str(pdf))

    extracted = extract_pdf_document(pdf)
    if document.content_hash and extracted.content_hash != document.content_hash:
        return RepairOutcome(str(document.id), source, "source_changed", "PDF differs from what was indexed; re-ingest instead")

    old = dict(document.doc_metadata or {})
    subject = old.get("subject") or Path(source).parts[0]
    fresh = infer_metadata(client, subject=subject, pdf_path=pdf, extracted=extracted)
    for key in PRESERVED_KEYS:
        if key in old:
            fresh[key] = old[key]
    history = list(old.get("metadata_repairs") or [])
    history.append({
        "at": datetime.now(UTC).isoformat(),
        "result": fresh.get("metadata_status"),
        "model": fresh.get("metadata_model"),
        "error": fresh.get("metadata_error"),
    })
    fresh["metadata_repairs"] = history

    if fresh.get("metadata_status") != "inferred":
        # Record the attempt but keep the document flagged; chunks untouched.
        old["metadata_repairs"] = history
        old["metadata_status"] = "failed"
        old["metadata_error"] = fresh.get("metadata_error")
        old["review_required"] = True
        document.doc_metadata = old
        db.commit()
        return RepairOutcome(str(document.id), source, "still_failing", str(fresh.get("metadata_error")))

    fresh["review_required"] = bool(fresh.get("pages_needing_ocr"))
    fresh["review_notes"] = [n for n in fresh.get("review_notes", []) if "inference was skipped" not in n]
    fresh["review_notes"].append(
        f"Metadata repaired on {history[-1]['at'][:10]} using {fresh.get('metadata_model') or 'Gemini'} "
        "after an earlier inference failure. Chunks and embeddings were not changed."
    )
    document.doc_metadata = fresh
    document.title = (fresh.get("chapter_title") or document.title)[:255]

    if document.topic_id:
        topic = db.get(Topic, document.topic_id)
        if topic is not None and fresh.get("chapter_title"):
            topic.name = fresh["chapter_title"][:160]
            objectives = fresh.get("learning_objectives") or []
            if objectives:
                topic.description = "; ".join(objectives[:3])[:2000]

    for chunk in db.scalars(select(AcademicContentChunk).where(AcademicContentChunk.document_id == document.id)):
        chunk.chunk_metadata = {
            **(chunk.chunk_metadata or {}),
            "chapter_title": fresh.get("chapter_title"),
            "chapter_number": fresh.get("chapter_number"),
        }
    db.commit()
    return RepairOutcome(str(document.id), source, "repaired", fresh.get("metadata_model") or "")


def mark_metadata_reviewed(db: Session, document: AcademicDocument, reviewer_email: str) -> AcademicDocument:
    """An admin has checked the (fallback or inferred) metadata and accepts it."""
    meta = dict(document.doc_metadata or {})
    meta["review_required"] = False
    meta["reviewed_at"] = datetime.now(UTC).isoformat()
    meta["reviewed_by"] = reviewer_email
    meta.setdefault("review_notes", []).append(f"Metadata reviewed and accepted by an admin on {meta['reviewed_at'][:10]}.")
    document.doc_metadata = meta
    db.commit()
    db.refresh(document)
    return document
