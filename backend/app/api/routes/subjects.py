"""Subject and topic read endpoints.

These are simple read-only lookups, so queries are issued directly here
rather than through a dedicated service layer.
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.core.exceptions import ConflictError, NotFoundError
from app.models.academic_document import AcademicDocument, IngestionStatus
from app.models.content_chunk import AcademicContentChunk
from app.models.learner import Learner
from app.models.subject import Subject
from app.models.topic import Topic
from app.schemas.subject import SubjectCreate, SubjectDetail, SubjectDocument, SubjectRead, SubjectUpdate, TopicRead
from app.utils.slugify import slugify

router = APIRouter(tags=["subjects"])


@router.get("/subjects", response_model=list[SubjectRead])
def list_subjects(include_inactive: bool = False, db: Session = Depends(get_db)) -> list[Subject]:
    stmt = select(Subject).order_by(Subject.name)
    if not include_inactive:
        stmt = stmt.where(Subject.is_active.is_(True))
    return list(db.scalars(stmt))


@router.get("/subjects/{subject_id}", response_model=SubjectDetail)
def get_subject(subject_id: uuid.UUID, db: Session = Depends(get_db)) -> Subject:
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise NotFoundError(f"Subject {subject_id} was not found")
    return subject


@router.get("/subjects/{subject_id}/topics", response_model=list[TopicRead])
def list_subject_topics(subject_id: uuid.UUID, db: Session = Depends(get_db)) -> list[Topic]:
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise NotFoundError(f"Subject {subject_id} was not found")
    return list(db.scalars(select(Topic).where(Topic.subject_id == subject_id).order_by(Topic.name)))


@router.get("/subjects/{subject_id}/documents", response_model=list[SubjectDocument])
def list_subject_documents(subject_id: uuid.UUID, db: Session = Depends(get_db)) -> list[SubjectDocument]:
    """Indexed textbook chapters for a subject (only what retrieval can actually search)."""
    if db.get(Subject, subject_id) is None:
        raise NotFoundError(f"Subject {subject_id} was not found")
    rows = db.execute(
        select(AcademicDocument, func.count(AcademicContentChunk.id))
        .outerjoin(AcademicContentChunk, AcademicContentChunk.document_id == AcademicDocument.id)
        .where(AcademicDocument.subject_id == subject_id, AcademicDocument.ingestion_status == IngestionStatus.indexed)
        .group_by(AcademicDocument.id)
        .order_by(AcademicDocument.title)
    ).all()
    return [
        SubjectDocument(
            id=doc.id, title=doc.title, topic_id=doc.topic_id,
            chapter_number=(doc.doc_metadata or {}).get("chapter_number"), page_count=doc.page_count, chunk_count=count,
        )
        for doc, count in rows
    ]


@router.get("/topics/{topic_id}", response_model=TopicRead)
def get_topic(topic_id: uuid.UUID, db: Session = Depends(get_db)) -> Topic:
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise NotFoundError(f"Topic {topic_id} was not found")
    return topic


@router.post("/admin/subjects", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreate, db: Session = Depends(get_db), _: Learner = Depends(require_admin)
) -> Subject:
    slug = slugify(payload.name)
    if db.scalar(select(Subject).where(Subject.slug == slug)) is not None:
        raise ConflictError(f"A subject named '{payload.name}' already exists")

    subject = Subject(name=payload.name, slug=slug, description=payload.description, is_active=True)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.patch("/admin/subjects/{subject_id}", response_model=SubjectRead)
def update_subject(
    subject_id: uuid.UUID,
    payload: SubjectUpdate,
    db: Session = Depends(get_db),
    _: Learner = Depends(require_admin),
) -> Subject:
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise NotFoundError(f"Subject {subject_id} was not found")

    if payload.name is not None:
        subject.name = payload.name
        subject.slug = slugify(payload.name)
    if payload.description is not None:
        subject.description = payload.description
    if payload.is_active is not None:
        subject.is_active = payload.is_active

    db.commit()
    db.refresh(subject)
    return subject
