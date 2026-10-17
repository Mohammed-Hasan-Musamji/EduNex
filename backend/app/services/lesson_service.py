"""Lesson session business logic: create, fetch, list, and resume.

Lesson sessions are persisted in PostgreSQL so a learner can leave and
return to a lesson without retyping their prompt and without depending on
Gemini to "remember" anything -- Gemini is stateless from this app's
perspective.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient
from app.ai.lesson_generator import LessonGenerator
from app.core.exceptions import NotFoundError, ServiceUnavailableError
from app.models.learner import Learner
from app.models.lesson import LessonSession, LessonSessionStatus
from app.models.topic import Topic
from app.schemas.lesson import Lesson, LessonSessionCreate


class LessonService:
    def __init__(self, db: Session, generator: LessonGenerator | None = None) -> None:
        self.db = db
        self.generator = generator or LessonGenerator(GeminiClient())

    def create_session(self, data: LessonSessionCreate) -> LessonSession:
        learner = self.db.get(Learner, data.learner_id)
        if learner is None:
            raise NotFoundError(f"Learner {data.learner_id} was not found")
        topic = self.db.get(Topic, data.topic_id)
        if topic is None:
            raise NotFoundError(f"Topic {data.topic_id} was not found")

        session = LessonSession(
            learner_id=data.learner_id,
            topic_id=data.topic_id,
            prompt=data.prompt,
            vark_preferences=[v.value for v in data.vark_preferences],
            status=LessonSessionStatus.generating,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        self._run_generation(session, topic)
        return session

    def get_session(self, lesson_id: uuid.UUID) -> LessonSession:
        session = self.db.get(LessonSession, lesson_id)
        if session is None:
            raise NotFoundError(f"Lesson session {lesson_id} was not found")
        return session

    def list_for_learner(self, learner_id: uuid.UUID) -> list[LessonSession]:
        stmt = (
            select(LessonSession)
            .where(LessonSession.learner_id == learner_id)
            .order_by(LessonSession.updated_at.desc())
        )
        return list(self.db.scalars(stmt))

    def resume_session(self, lesson_id: uuid.UUID) -> LessonSession:
        session = self.get_session(lesson_id)
        if session.status == LessonSessionStatus.failed:
            topic = self.db.get(Topic, session.topic_id)
            if topic is not None:
                self._run_generation(session, topic)
        return session

    def _run_generation(self, session: LessonSession, topic: Topic) -> None:
        try:
            lesson, source_refs = self.generator.generate(
                self.db,
                topic=topic,
                learner_prompt=session.prompt,
                vark_preferences=session.vark_preferences,
            )
        except ServiceUnavailableError as exc:
            session.status = LessonSessionStatus.failed
            session.failure_reason = str(exc)
            self.db.commit()
            raise

        session.lesson_json = lesson.model_dump(mode="json")
        session.source_references = [ref.model_dump(mode="json") for ref in source_refs]
        session.status = LessonSessionStatus.ready
        session.failure_reason = None
        self.db.commit()
        self.db.refresh(session)


def to_lesson_session_read(session: LessonSession) -> dict:
    """Builds the LessonSessionRead response payload from an ORM row."""
    return {
        "id": session.id,
        "learner_id": session.learner_id,
        "topic_id": session.topic_id,
        "prompt": session.prompt,
        "vark_preferences": session.vark_preferences,
        "status": session.status.value,
        "lesson": Lesson.model_validate(session.lesson_json) if session.lesson_json else None,
        "source_references": session.source_references,
        "failure_reason": session.failure_reason,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
    }
