"""Baseline next-activity recommendations.

This is a simple, explainable heuristic -- not a scientifically validated
mastery/recommendation model. The rules are:

1. No recorded attempts on a topic -> a beginner-level practice recommendation.
2. The learner's most recent attempts on a topic were all incorrect (and
   there are at least 2 of them) -> a review recommendation.
3. At least 3 attempts recorded and overall accuracy >= 80% -> a
   harder-practice recommendation.
4. Otherwise -> a "continue at current level" recommendation.

Limitations: it only looks at accuracy and recency, not question difficulty,
response time, or topic prerequisites, and it treats every question on a
topic as equally informative about mastery of that topic.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentAttempt, AssessmentQuestion
from app.models.progress import LearnerProgress
from app.models.topic import Topic
from app.schemas.progress import Recommendation

RECENT_ATTEMPTS_WINDOW = 3
HARD_PRACTICE_MIN_ATTEMPTS = 3
HARD_PRACTICE_ACCURACY_THRESHOLD = 0.8


def _recent_attempts(db: Session, learner_id: uuid.UUID, topic_id: uuid.UUID) -> list[AssessmentAttempt]:
    stmt = (
        select(AssessmentAttempt)
        .join(AssessmentQuestion, AssessmentAttempt.question_id == AssessmentQuestion.id)
        .where(AssessmentAttempt.learner_id == learner_id, AssessmentQuestion.topic_id == topic_id)
        .order_by(AssessmentAttempt.created_at.desc())
        .limit(RECENT_ATTEMPTS_WINDOW)
    )
    return list(db.scalars(stmt))


def recommend_for_topic(db: Session, learner_id: uuid.UUID, topic: Topic, progress: LearnerProgress | None) -> Recommendation:
    if progress is None or progress.attempts_count == 0:
        return Recommendation(
            topic_id=topic.id,
            topic_name=topic.name,
            recommendation_type="beginner_practice",
            label=f"Start practicing {topic.name}",
            rationale="No attempts have been recorded for this topic yet.",
        )

    recent = _recent_attempts(db, learner_id, topic.id)
    if len(recent) >= 2 and all(not attempt.is_correct for attempt in recent):
        return Recommendation(
            topic_id=topic.id,
            topic_name=topic.name,
            recommendation_type="review",
            label=f"Review {topic.name}",
            rationale=f"The last {len(recent)} attempts on this topic were incorrect.",
        )

    if progress.attempts_count >= HARD_PRACTICE_MIN_ATTEMPTS:
        accuracy = progress.correct_count / progress.attempts_count
        if accuracy >= HARD_PRACTICE_ACCURACY_THRESHOLD:
            return Recommendation(
                topic_id=topic.id,
                topic_name=topic.name,
                recommendation_type="practice_harder",
                label=f"Try harder {topic.name} practice",
                rationale=f"{round(accuracy * 100)}% accuracy over {progress.attempts_count} attempts.",
            )

    return Recommendation(
        topic_id=topic.id,
        topic_name=topic.name,
        recommendation_type="continue",
        label=f"Keep practicing {topic.name}",
        rationale="Steady progress -- continue with current-level practice.",
    )
