"""Saved (bookmarked) lesson endpoints."""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_owner_or_admin
from app.core.exceptions import ConflictError, NotFoundError
from app.models.learner import Learner
from app.models.lesson import LessonSession
from app.models.saved_lesson import SavedLesson
from app.schemas.saved_lesson import SavedLessonRead

router = APIRouter(prefix="/learners/{learner_id}/saved-lessons", tags=["saved-lessons"])


def _to_read(saved: SavedLesson) -> SavedLessonRead:
    lesson_title = None
    if saved.lesson_session.lesson_json:
        lesson_title = saved.lesson_session.lesson_json.get("title")
    return SavedLessonRead(
        id=saved.id,
        learner_id=saved.learner_id,
        lesson_session_id=saved.lesson_session_id,
        topic_name=saved.lesson_session.topic.name if saved.lesson_session.topic else "",
        lesson_title=lesson_title,
        saved_at=saved.saved_at,
    )


@router.post("/{lesson_id}", response_model=SavedLessonRead, status_code=status.HTTP_201_CREATED)
def save_lesson(
    learner_id: uuid.UUID,
    lesson_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Learner = Depends(verify_owner_or_admin),
) -> SavedLessonRead:
    lesson_session = db.get(LessonSession, lesson_id)
    if lesson_session is None or lesson_session.learner_id != learner_id:
        raise NotFoundError(f"Lesson session {lesson_id} was not found for this learner")

    existing = db.scalar(
        select(SavedLesson).where(SavedLesson.learner_id == learner_id, SavedLesson.lesson_session_id == lesson_id)
    )
    if existing is not None:
        raise ConflictError("This lesson is already saved")

    saved = SavedLesson(learner_id=learner_id, lesson_session_id=lesson_id)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return _to_read(saved)


@router.get("", response_model=list[SavedLessonRead])
def list_saved_lessons(
    learner_id: uuid.UUID, db: Session = Depends(get_db), _: Learner = Depends(verify_owner_or_admin)
) -> list[SavedLessonRead]:
    stmt = select(SavedLesson).where(SavedLesson.learner_id == learner_id).order_by(SavedLesson.saved_at.desc())
    return [_to_read(saved) for saved in db.scalars(stmt)]


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_saved_lesson(
    learner_id: uuid.UUID,
    lesson_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Learner = Depends(verify_owner_or_admin),
) -> None:
    saved = db.scalar(
        select(SavedLesson).where(SavedLesson.learner_id == learner_id, SavedLesson.lesson_session_id == lesson_id)
    )
    if saved is None:
        raise NotFoundError("This lesson is not saved")
    db.delete(saved)
    db.commit()
