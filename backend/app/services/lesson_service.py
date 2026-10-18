"""Lesson session business logic: create, fetch, list, and resume.

Lesson sessions are persisted in PostgreSQL so a learner can leave and
return to a lesson without retyping their prompt and without depending on
Gemini to "remember" anything -- Gemini is stateless from this app's
perspective.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient
from app.ai.lesson_generator import LessonGenerator
from app.core.exceptions import ForbiddenError, NotFoundError, ServiceUnavailableError, ValidationAppError
from app.db.transaction import run_in_transaction
from app.models.gamification import LearningEventType
from app.models.learner import Learner, LearnerRole
from app.models.lesson import LessonSession, LessonSessionStatus
from app.models.topic import Topic
from app.schemas.lesson import Lesson, LessonCompletionResult, LessonSessionCreate
from app.services.gamification_service import LESSON_COMPLETED_XP, RewardSession


class LessonService:
    def __init__(self, db: Session, generator: LessonGenerator | None = None) -> None:
        self.db = db
        self.generator = generator or LessonGenerator(GeminiClient())

    def create_session(self, learner: Learner, data: LessonSessionCreate) -> LessonSession:
        topic = self.db.get(Topic, data.topic_id)
        if topic is None:
            raise NotFoundError(f"Topic {data.topic_id} was not found")

        # An explicit per-lesson choice wins; otherwise fall back to the
        # preferences saved on the learner's profile (empty = balanced).
        vark = [v.value for v in data.vark_preferences] or list((learner.preferences or {}).get("vark_preferences", []))
        session = LessonSession(
            learner_id=learner.id,
            topic_id=data.topic_id,
            prompt=data.prompt,
            vark_preferences=vark,
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

    def get_session_for_owner(self, lesson_id: uuid.UUID, current: Learner) -> LessonSession:
        session = self.get_session(lesson_id)
        if session.learner_id != current.id and current.role != LearnerRole.admin:
            raise ForbiddenError("You do not have permission to access this lesson session.")
        return session

    def list_for_learner(self, learner_id: uuid.UUID) -> list[LessonSession]:
        stmt = (
            select(LessonSession)
            .where(LessonSession.learner_id == learner_id)
            .order_by(LessonSession.updated_at.desc())
        )
        return list(self.db.scalars(stmt))

    def resume_session(self, lesson_id: uuid.UUID, current: Learner) -> LessonSession:
        session = self.get_session_for_owner(lesson_id, current)
        if session.status == LessonSessionStatus.failed:
            topic = self.db.get(Topic, session.topic_id)
            if topic is not None:
                self._run_generation(session, topic)
        return session

    def complete_session(self, lesson_id: uuid.UUID, current: Learner) -> LessonCompletionResult:
        return run_in_transaction(self.db, lambda: self._complete_session(lesson_id, current))

    def _complete_session(self, lesson_id: uuid.UUID, current: Learner) -> LessonCompletionResult:
        session = self.get_session(lesson_id)
        # Rewards belong to the learner who took the lesson -- even an admin
        # cannot complete someone else's lesson on their behalf.
        if session.learner_id != current.id:
            raise ForbiddenError("You can only complete your own lessons.")
        if session.status != LessonSessionStatus.ready or not session.lesson_json:
            raise ValidationAppError("Only a successfully generated lesson can be completed.")
        if session.completed_at is not None:
            return LessonCompletionResult(
                lesson_session_id=session.id, completed_at=session.completed_at, already_completed=True, rewards=None
            )

        now = datetime.now(UTC)
        session.completed_at = now
        self.db.flush()
        title = (session.lesson_json or {}).get("title") or (session.topic.name if session.topic else "a lesson")
        rewards = RewardSession(self.db, current, now)
        rewards.award(
            LearningEventType.lesson_completed,
            f"lesson:{session.id}",
            LESSON_COMPLETED_XP,
            title="Completed a lesson",
            description=f"{title}" + (f" ({session.topic.name})" if session.topic else ""),
            resource_id=session.id,
        )
        return LessonCompletionResult(
            lesson_session_id=session.id, completed_at=now, already_completed=False, rewards=rewards.finish()
        )

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
        "completed_at": session.completed_at,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
    }
