"""Lesson session endpoints: create, fetch, list, and resume."""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.lesson import LessonSession
from app.schemas.lesson import (
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
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.post("/lessons", response_model=LessonSessionRead, status_code=status.HTTP_201_CREATED)
def create_lesson(payload: LessonSessionCreate, db: Session = Depends(get_db)) -> LessonSessionRead:
    session = LessonService(db).create_session(payload)
    return LessonSessionRead.model_validate(to_lesson_session_read(session))


@router.get("/lessons/{lesson_id}", response_model=LessonSessionRead)
def get_lesson(lesson_id: uuid.UUID, db: Session = Depends(get_db)) -> LessonSessionRead:
    session = LessonService(db).get_session(lesson_id)
    return LessonSessionRead.model_validate(to_lesson_session_read(session))


@router.post("/lessons/{lesson_id}/resume", response_model=LessonSessionRead)
def resume_lesson(lesson_id: uuid.UUID, db: Session = Depends(get_db)) -> LessonSessionRead:
    session = LessonService(db).resume_session(lesson_id)
    return LessonSessionRead.model_validate(to_lesson_session_read(session))


@router.get("/learners/{learner_id}/lessons", response_model=list[LessonSessionSummary])
def list_learner_lessons(learner_id: uuid.UUID, db: Session = Depends(get_db)) -> list[LessonSessionSummary]:
    sessions = LessonService(db).list_for_learner(learner_id)
    return [_summary(session) for session in sessions]
