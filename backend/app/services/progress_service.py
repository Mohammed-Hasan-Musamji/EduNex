"""Learner progress tracking.

Mastery estimate is a simple, explainable ratio of correct-to-total
attempts (0-100). It is a baseline heuristic for this MVP, not a validated
psychometric mastery model (e.g. Bayesian Knowledge Tracing or IRT).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
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
        if progress is not None:
            return progress

        # Two concurrent attempts on a topic with no existing progress row can
        # both reach here before either commits (e.g. parallel attempt
        # submissions from the client). Only one insert can win the unique
        # (learner_id, topic_id) constraint -- the loser re-reads instead of
        # raising, rather than failing the whole request.
        progress = LearnerProgress(learner_id=learner_id, topic_id=topic_id)
        self.db.add(progress)
        try:
            self.db.flush()
        except IntegrityError:
            self.db.rollback()
            progress = self.get_progress(learner_id, topic_id)
            if progress is None:
                raise
        return progress

    def apply_attempt(self, learner_id: uuid.UUID, topic_id: uuid.UUID, is_correct: bool, at: datetime | None = None) -> LearnerProgress:
        """Like record_attempt, but only flushes -- for callers that commit a
        larger unit of work themselves (see app/db/transaction.py). A
        first-insert race raises IntegrityError at flush/commit and is
        retried by that unit as a whole."""
        progress = self.get_progress(learner_id, topic_id)
        if progress is None:
            progress = LearnerProgress(learner_id=learner_id, topic_id=topic_id, attempts_count=0, correct_count=0)
            self.db.add(progress)
        progress.attempts_count += 1
        if is_correct:
            progress.correct_count += 1
        progress.last_activity_at = at or datetime.now(UTC)
        progress.mastery_estimate = round(100.0 * progress.correct_count / progress.attempts_count, 2)
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
