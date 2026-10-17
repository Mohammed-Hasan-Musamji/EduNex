"""Learner progress tracking.

Mastery estimate is a simple, explainable ratio of correct-to-total
attempts (0-100). It is a baseline heuristic for this MVP, not a validated
psychometric mastery model (e.g. Bayesian Knowledge Tracing or IRT).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.progress import LearnerProgress


class ProgressService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_progress(self, learner_id: uuid.UUID, topic_id: uuid.UUID) -> LearnerProgress | None:
        return self.db.scalar(
            select(LearnerProgress).where(
                LearnerProgress.learner_id == learner_id, LearnerProgress.topic_id == topic_id
            )
        )

    def list_for_learner(self, learner_id: uuid.UUID) -> list[LearnerProgress]:
        stmt = select(LearnerProgress).where(LearnerProgress.learner_id == learner_id)
        return list(self.db.scalars(stmt))

    def _get_or_create(self, learner_id: uuid.UUID, topic_id: uuid.UUID) -> LearnerProgress:
        progress = self.get_progress(learner_id, topic_id)
        if progress is None:
            progress = LearnerProgress(learner_id=learner_id, topic_id=topic_id)
            self.db.add(progress)
            self.db.flush()
        return progress

    def record_attempt(self, learner_id: uuid.UUID, topic_id: uuid.UUID, is_correct: bool) -> LearnerProgress:
        progress = self._get_or_create(learner_id, topic_id)
        progress.attempts_count += 1
        if is_correct:
            progress.correct_count += 1
        progress.last_activity_at = datetime.now(UTC)
        progress.mastery_estimate = round(100.0 * progress.correct_count / progress.attempts_count, 2)
        self.db.commit()
        self.db.refresh(progress)
        return progress
