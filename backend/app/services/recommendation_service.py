"""Baseline next-activity recommendations.

Uses the explicit REMEDIATE/MAINTAIN/ADVANCE policy in
app/services/adaptive_policy.py, applied to the learner's most recent
assessment round for a topic (up to ASSESSMENT_ROUND_SIZE questions, the
canonical round size the policy's thresholds are expressed against).

This is a simple, explainable heuristic -- not a scientifically validated
mastery/recommendation model. Limitations: it only looks at recent
accuracy, not question difficulty, response time, or topic prerequisites,
and it treats every question on a topic as equally informative about
mastery of that topic.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentAttempt, AssessmentQuestion
from app.models.progress import LearnerProgress
from app.models.subject import Subject
from app.models.topic import DifficultyLevel, Topic
from app.schemas.progress import Recommendation
from app.services.adaptive_policy import AdaptiveAction, evaluate_adaptive_action

ASSESSMENT_ROUND_SIZE = 5

_NEXT_DIFFICULTY = {
    DifficultyLevel.beginner: DifficultyLevel.intermediate,
    DifficultyLevel.intermediate: DifficultyLevel.advanced,
    DifficultyLevel.advanced: None,
}


def _recent_attempts(db: Session, learner_id: uuid.UUID, topic_id: uuid.UUID) -> list[AssessmentAttempt]:
    stmt = (
        select(AssessmentAttempt)
        .join(AssessmentQuestion, AssessmentAttempt.question_id == AssessmentQuestion.id)
        .where(AssessmentAttempt.learner_id == learner_id, AssessmentQuestion.topic_id == topic_id)
        .order_by(AssessmentAttempt.created_at.desc())
        .limit(ASSESSMENT_ROUND_SIZE)
    )
    return list(db.scalars(stmt))


def _find_next_topic(db: Session, topic: Topic) -> Topic | None:
    """A topic in the same subject at the next difficulty tier up, if one
    exists in the curriculum. Returns None rather than fabricating a next
    step that doesn't exist yet."""
    next_difficulty = _NEXT_DIFFICULTY.get(topic.difficulty)
    if next_difficulty is None:
        return None
    return db.scalar(
        select(Topic).where(Topic.subject_id == topic.subject_id, Topic.difficulty == next_difficulty).limit(1)
    )


def recommend_for_topic(db: Session, learner_id: uuid.UUID, topic: Topic, progress: LearnerProgress | None) -> Recommendation:
    if progress is None or progress.attempts_count == 0:
        return Recommendation(
            topic_id=topic.id,
            topic_name=topic.name,
            recommendation_type="beginner_practice",
            label=f"Start practicing {topic.name}",
            rationale="No attempts have been recorded for this topic yet.",
            difficulty=topic.difficulty,
            suggested_activity="lesson",
            priority=1,
        )

    recent = _recent_attempts(db, learner_id, topic.id)
    correct = sum(1 for attempt in recent if attempt.is_correct)
    action = evaluate_adaptive_action(correct, len(recent))
    accuracy_pct = round(100 * correct / len(recent))

    if action == AdaptiveAction.remediate:
        return Recommendation(
            topic_id=topic.id,
            topic_name=topic.name,
            recommendation_type="review",
            label=f"Review {topic.name}",
            rationale=f"REMEDIATE: {correct}/{len(recent)} correct ({accuracy_pct}%) on the most recent attempts.",
            difficulty=topic.difficulty,
            suggested_activity="lesson",
            priority=0,
        )

    if action == AdaptiveAction.advance:
        next_topic = _find_next_topic(db, topic)
        if next_topic is not None:
            return Recommendation(
                topic_id=next_topic.id,
                topic_name=next_topic.name,
                recommendation_type="practice_harder",
                label=f"Move on to {next_topic.name}",
                rationale=f"ADVANCE: a perfect {correct}/{len(recent)} on {topic.name} -- ready for the next topic.",
                difficulty=next_topic.difficulty,
                suggested_activity="lesson",
                priority=3,
            )
        return Recommendation(
            topic_id=topic.id,
            topic_name=topic.name,
            recommendation_type="practice_harder",
            label=f"Try harder {topic.name} practice",
            rationale=(
                f"ADVANCE: a perfect {correct}/{len(recent)} on {topic.name}, but no harder topic exists yet in "
                "this subject's curriculum -- this does not claim permanent mastery."
            ),
            difficulty=topic.difficulty,
            suggested_activity="practice",
            priority=3,
        )

    return Recommendation(
        topic_id=topic.id,
        topic_name=topic.name,
        recommendation_type="continue",
        label=f"Keep practicing {topic.name}",
        rationale=f"MAINTAIN: {correct}/{len(recent)} correct ({accuracy_pct}%) on the most recent attempts.",
        difficulty=topic.difficulty,
        suggested_activity="practice",
        priority=2,
    )


def recommendations_for(db: Session, learner_id: uuid.UUID) -> list[Recommendation]:
    """One recommendation per attempted topic, plus a fresh start for every
    active topic not attempted yet, ordered by priority (review first)."""
    records = list(db.scalars(select(LearnerProgress).where(LearnerProgress.learner_id == learner_id)))
    by_topic = {p.topic_id: p for p in records}
    recommendations = []
    for progress in records:
        topic = db.get(Topic, progress.topic_id)
        if topic is not None:
            recommendations.append(recommend_for_topic(db, learner_id, topic, progress))
    for topic in db.scalars(select(Topic).join(Subject).where(Subject.is_active.is_(True))):
        if topic.id not in by_topic:
            recommendations.append(recommend_for_topic(db, learner_id, topic, None))
    return sorted(recommendations, key=lambda r: r.priority)

