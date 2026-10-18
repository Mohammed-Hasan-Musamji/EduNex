"""Knowledge-base (academic document ingestion + retrieval) admin endpoints.

Every route here requires an authenticated admin (see
app/api/deps.py:require_admin) -- enforced server-side, not merely by
hiding the admin page in the frontend.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient, get_gemini_client
from app.api.deps import get_db, require_admin
from app.core.config import get_settings
from app.core.exceptions import NotFoundError, ServiceUnavailableError
from app.models.academic_document import AcademicDocument, DocumentContentType
from app.models.learner import Learner
from app.rag.document_loader import load_text_from_upload, validate_text
from app.rag.embeddings import embed_query
from app.rag.ingestion import ingest_document
from app.rag.metadata_repair import mark_metadata_reviewed, repair_document_metadata
from app.rag.retriever import retrieve
from app.schemas.knowledge_base import (
    DocumentRead,
    DocumentTextCreate,
    IngestResponse,
    KnowledgeBaseSearchRequest,
    KnowledgeBaseSearchResponse,
    SearchResult,
)

router = APIRouter(
    prefix="/admin/knowledge-base", tags=["knowledge-base-admin"], dependencies=[Depends(require_admin)]
)


def _to_document_read(document: AcademicDocument) -> DocumentRead:
    return DocumentRead(
        id=document.id,
        title=document.title,
        source_name=document.source_name,
        content_type=document.content_type,
        subject_id=document.subject_id,
        ingestion_status=document.ingestion_status,
        failure_detail=document.failure_detail,
        chunk_count=len(document.chunks),
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.post("/documents", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def create_document(payload: DocumentTextCreate, db: Session = Depends(get_db)) -> DocumentRead:
    document = AcademicDocument(
        title=payload.title,
        source_name=payload.source_name,
        raw_text=payload.text,
        content_type=DocumentContentType(payload.content_type),
        subject_id=payload.subject_id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return _to_document_read(document)


@router.post("/documents/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def upload_document(
    title: str = Form(..., min_length=1, max_length=255),
    source_name: str | None = Form(default=None, max_length=255),
    subject_id: uuid.UUID | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> DocumentRead:
    """Accepts a .txt/.md file upload. The file is read entirely into memory
    and decoded to text -- it is never written to or read from a server
    file path, so there is no path-traversal surface."""
    raw_bytes = file.file.read()
    text = load_text_from_upload(file.filename or "", raw_bytes)
    content_type = DocumentContentType.markdown if (file.filename or "").endswith((".md", ".markdown")) else DocumentContentType.text

    document = AcademicDocument(
        title=title,
        source_name=source_name,
        raw_text=text,
        content_type=content_type,
        subject_id=subject_id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return _to_document_read(document)


@router.get("/documents", response_model=list[DocumentRead])
def list_documents(db: Session = Depends(get_db)) -> list[DocumentRead]:
    documents = list(db.scalars(select(AcademicDocument).order_by(AcademicDocument.created_at.desc())))
    return [_to_document_read(d) for d in documents]


@router.get("/documents/{document_id}", response_model=DocumentRead)
def get_document(document_id: uuid.UUID, db: Session = Depends(get_db)) -> DocumentRead:
    document = db.get(AcademicDocument, document_id)
    if document is None:
        raise NotFoundError(f"Document {document_id} was not found")
    return _to_document_read(document)


@router.post("/documents/{document_id}/ingest", response_model=IngestResponse)
def ingest_document_route(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    gemini_client: GeminiClient = Depends(get_gemini_client),
) -> IngestResponse:
    document = db.get(AcademicDocument, document_id)
    if document is None:
        raise NotFoundError(f"Document {document_id} was not found")

    document = ingest_document(db, document, gemini_client)
    return IngestResponse(
        document_id=document.id,
        ingestion_status=document.ingestion_status,
        chunk_count=len(document.chunks),
        failure_detail=document.failure_detail,
    )


@router.post("/search", response_model=KnowledgeBaseSearchResponse)
def search_knowledge_base(
    payload: KnowledgeBaseSearchRequest,
    db: Session = Depends(get_db),
    gemini_client: GeminiClient = Depends(get_gemini_client),
) -> KnowledgeBaseSearchResponse:
    validate_text(payload.query)
    settings = get_settings()

    try:
        query_embedding = embed_query(gemini_client, payload.query)
    except ServiceUnavailableError as exc:
        return KnowledgeBaseSearchResponse(query=payload.query, results=[], warning=str(exc))

    chunks = retrieve(db, query_embedding, top_k=payload.top_k or settings.rag_top_k)
    if not chunks:
        return KnowledgeBaseSearchResponse(
            query=payload.query, results=[], warning="No relevant chunks were found for this query."
        )

    results = [
        SearchResult(
            chunk_id=c.chunk_id,
            document_id=c.document_id,
            document_title=c.document_title,
            excerpt=c.chunk_text[:400],
            similarity_score=c.similarity_score,
        )
        for c in chunks
    ]
    return KnowledgeBaseSearchResponse(query=payload.query, results=results)


TEXTBOOK_ROOT = Path(__file__).resolve().parents[3] / "data" / "Textbook"


@router.post("/documents/{document_id}/repair-metadata")
def repair_metadata_route(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    gemini_client: GeminiClient = Depends(get_gemini_client),
) -> dict:
    """Retries AI metadata inference for a textbook document whose inference
    failed. Never deletes, re-creates, or re-embeds chunks."""
    document = db.get(AcademicDocument, document_id)
    if document is None:
        raise NotFoundError(f"Document {document_id} was not found")
    return repair_document_metadata(db, document, gemini_client, TEXTBOOK_ROOT).__dict__


@router.post("/documents/{document_id}/metadata-review")
def review_metadata_route(
    document_id: uuid.UUID, db: Session = Depends(get_db), admin: Learner = Depends(require_admin)
) -> dict:
    """An admin explicitly accepts the document's current metadata (clears review_required)."""
    document = db.get(AcademicDocument, document_id)
    if document is None:
        raise NotFoundError(f"Document {document_id} was not found")
    meta = mark_metadata_reviewed(db, document, admin.email).doc_metadata
    return {"document_id": str(document.id), "review_required": meta["review_required"], "reviewed_at": meta["reviewed_at"]}

