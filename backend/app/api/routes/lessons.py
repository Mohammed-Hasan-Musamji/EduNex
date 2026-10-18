"""Lesson session endpoints: create, fetch, list, and resume.

learner_id is never accepted from the client for creation -- it is always
the authenticated caller. Fetch/resume verify the session belongs to the
caller (or that the caller is an admin).
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_learner, get_db, verify_owner_or_admin
from app.models.learner import Learner
from app.models.lesson import LessonSession
from app.schemas.lesson import (
    LessonCompletionResult,
    LessonSessionCreate,
    LessonSessionRead,
    LessonSessionSummary,
)
from app.services.lesson_service import LessonService, to_lesson_session_read

router = APIRouter(tags=["lessons"])


def _summary(session: LessonSession) -> LessonSessionSummary:
    return LessonSessionSummary(
        id=session.id,
        topic_id=session.topic_id,
        topic_name=session.topic.name if session.topic else "",
        status=session.status.value,
        prompt=session.prompt,
        lesson_title=(session.lesson_json or {}).get("title"),
        completed_at=session.completed_at,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.post("/lessons", response_model=LessonSessionRead, status_code=status.HTTP_201_CREATED)
def create_lesson(
    payload: LessonSessionCreate,
    db: Session = Depends(get_db),
    current: Learner = Depends(get_current_learner),
) -> LessonSessionRead:
    session = LessonService(db).create_session(current, payload)
    return LessonSessionRead.model_validate(to_lesson_session_read(session))


@router.get("/lessons/{lesson_id}", response_model=LessonSessionRead)
def get_lesson(
    lesson_id: uuid.UUID, db: Session = Depends(get_db), current: Learner = Depends(get_current_learner)
) -> LessonSessionRead:
    session = LessonService(db).get_session_for_owner(lesson_id, current)
    return LessonSessionRead.model_validate(to_lesson_session_read(session))


@router.post("/lessons/{lesson_id}/resume", response_model=LessonSessionRead)
def resume_lesson(
    lesson_id: uuid.UUID, db: Session = Depends(get_db), current: Learner = Depends(get_current_learner)
) -> LessonSessionRead:
    session = LessonService(db).resume_session(lesson_id, current)
    return LessonSessionRead.model_validate(to_lesson_session_read(session))


@router.post("/lessons/{lesson_id}/complete", response_model=LessonCompletionResult)
def complete_lesson(
    lesson_id: uuid.UUID, db: Session = Depends(get_db), current: Learner = Depends(get_current_learner)
) -> LessonCompletionResult:
    """Marks a generated lesson as finished by its learner and awards XP once.
    Idempotent: repeating it returns already_completed=True with no reward."""
    return LessonService(db).complete_session(lesson_id, current)


@router.get("/learners/{learner_id}/lessons", response_model=list[LessonSessionSummary])
def list_learner_lessons(
    learner_id: uuid.UUID, db: Session = Depends(get_db), _: Learner = Depends(verify_owner_or_admin)
) -> list[LessonSessionSummary]:
    sessions = LessonService(db).list_for_learner(learner_id)
    return [_summary(session) for session in sessions]
