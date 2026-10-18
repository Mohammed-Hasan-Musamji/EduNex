"""Explainable per-topic skill estimates.

Two numbers are kept apart on purpose:
- measured accuracy: correct / attempted -- exactly what happened.
- estimated mastery: the mean of a Beta(1 + correct, 1 + incorrect)
  posterior, i.e. (correct + 1) / (attempts + 2). With no evidence it sits at
  50% with maximal uncertainty; one correct answer moves it to 67%, not
  100%. `uncertainty` is about one standard deviation of that posterior, in
  percentage points, so "3/3 correct" honestly reads as roughly 80% +/- 16.

Evidence level (by answers attempted): none 0, low 1-4, medium 5-11, high 12+.

Misconceptions are reported only with direct evidence: a specific question
answered incorrectly at least twice. They name the question; they don't
diagnose the learner.

A SkillSnapshot is written for every topic a completed practice round or
diagnostic touched, so progress can be compared over time.
"""

from __future__ import annotations

import math
import uuid
from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentAttempt, AssessmentQuestion
from app.models.learning_profile import SkillSnapshot
from app.models.progress import LearnerProgress
from app.models.subject import Subject
from app.models.topic import Topic

MISCONCEPTION_MIN_MISSES = 2


def estimated_mastery(correct: int, attempts: int) -> float:
    return round(100.0 * (correct + 1) / (attempts + 2), 1)


def uncertainty(correct: int, attempts: int) -> float:
    a, b = correct + 1, attempts - correct + 1
    variance = (a * b) / ((a + b) ** 2 * (a + b + 1))
    return round(100.0 * math.sqrt(variance), 1)


def evidence_level(attempts: int) -> str:
    if attempts == 0:
        return "none"
    if attempts < 5:
        return "low"
    if attempts < 12:
        return "medium"
    return "high"


def record_snapshots(db: Session, learner_id: uuid.UUID, round_id: uuid.UUID, results_by_topic: dict[uuid.UUID, list[bool]]) -> None:
    """Call after a round's attempts and progress rows are flushed."""
    for topic_id, results in results_by_topic.items():
        progress = db.scalar(
            select(LearnerProgress).where(LearnerProgress.learner_id == learner_id, LearnerProgress.topic_id == topic_id)
        )
        if progress is None:
            continue
        db.add(
            SkillSnapshot(
                learner_id=learner_id,
                topic_id=topic_id,
                round_id=round_id,
                measured_accuracy=round(100.0 * sum(results) / len(results), 1) if results else None,
                estimated_mastery=estimated_mastery(progress.correct_count, progress.attempts_count),
                attempts=progress.attempts_count,
                correct=progress.correct_count,
                evidence_level=evidence_level(progress.attempts_count),
            )
        )
    db.flush()


def skill_profile(db: Session, learner_id: uuid.UUID) -> dict:
    progress = {p.topic_id: p for p in db.scalars(select(LearnerProgress).where(LearnerProgress.learner_id == learner_id))}

    misses: dict[uuid.UUID, int] = dict(
        db.execute(
            select(AssessmentAttempt.question_id, func.count(AssessmentAttempt.id))
            .where(AssessmentAttempt.learner_id == learner_id, AssessmentAttempt.is_correct.is_(False))
            .group_by(AssessmentAttempt.question_id)
        ).all()
    )
    misconceptions: dict[uuid.UUID, list[dict]] = defaultdict(list)
    repeated = [qid for qid, n in misses.items() if n >= MISCONCEPTION_MIN_MISSES]
    if repeated:
        for question in db.scalars(select(AssessmentQuestion).where(AssessmentQuestion.id.in_(repeated))):
            misconceptions[question.topic_id].append(
                {"question_id": question.id, "question_text": question.question_text, "times_missed": misses[question.id],
                 "explanation": question.explanation}
            )

    first_snapshot: dict[uuid.UUID, SkillSnapshot] = {}
    for snap in db.scalars(
        select(SkillSnapshot).where(SkillSnapshot.learner_id == learner_id).order_by(SkillSnapshot.created_at)
    ):
        first_snapshot.setdefault(snap.topic_id, snap)

    rows = db.execute(select(Topic, Subject.name).join(Subject, Topic.subject_id == Subject.id).where(Subject.is_active.is_(True))).all()
    topics = []
    for topic, subject_name in rows:
        p = progress.get(topic.id)
        attempts = p.attempts_count if p else 0
        correct = p.correct_count if p else 0
        first = first_snapshot.get(topic.id)
        current_estimate = estimated_mastery(correct, attempts)
        topics.append(
            {
                "topic_id": topic.id,
                "topic_name": topic.name,
                "subject_id": topic.subject_id,
                "subject_name": subject_name,
                "difficulty": topic.difficulty,
                "attempts": attempts,
                "correct": correct,
                "measured_accuracy": round(100.0 * correct / attempts, 1) if attempts else None,
                "estimated_mastery": current_estimate,
                "uncertainty": uncertainty(correct, attempts),
                "evidence_level": evidence_level(attempts),
                "last_assessed_at": p.last_activity_at if p else None,
                "change_since_first_snapshot": (
                    round(current_estimate - first.estimated_mastery, 1) if first and attempts > first.attempts else None
                ),
                "misconceptions": misconceptions.get(topic.id, []),
            }
        )
    topics.sort(key=lambda t: (t["evidence_level"] == "none", t["subject_name"], t["topic_name"]))
    return {"topics": topics}


def snapshot_history(db: Session, learner_id: uuid.UUID, topic_id: uuid.UUID | None) -> list[SkillSnapshot]:
    stmt = select(SkillSnapshot).where(SkillSnapshot.learner_id == learner_id)
    if topic_id is not None:
        stmt = stmt.where(SkillSnapshot.topic_id == topic_id)
    return list(db.scalars(stmt.order_by(SkillSnapshot.created_at)))
