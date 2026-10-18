"""Learner progress analytics and the learning timeline.

Everything is aggregated from persisted rows at request time; nothing is
estimated or defaulted. Definitions:
- lessons_completed: lesson sessions the learner explicitly completed.
- assessments_completed: completed practice rounds + diagnostics.
- questions_answered / overall_accuracy: every server-evaluated attempt.
- concepts_mastered: topics at >= MASTERY_THRESHOLD over >= MASTERY_MIN_ATTEMPTS answers.
- concepts_needing_attention: attempted topics below NEEDS_ATTENTION_THRESHOLD.
- daily_activity: attempts and lesson completions bucketed by calendar day
  in Settings.activity_timezone.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentAttempt, AssessmentQuestion, AssessmentRound, AssessmentRoundStatus
from app.models.gamification import LearningEvent
from app.models.lesson import LessonSession
from app.models.progress import LearnerProgress
from app.models.subject import Subject
from app.models.topic import DifficultyLevel, Topic
from app.schemas.analytics import (
    AnalyticsSummary,
    DailyActivity,
    DifficultyStat,
    LearnerAnalytics,
    MasteryPolicy,
    ScorePoint,
    TopicMastery,
)
from app.schemas.gamification import TimelineEvent
from app.services.gamification_service import (
    MASTERY_MIN_ATTEMPTS,
    MASTERY_THRESHOLD,
    NEEDS_ATTENTION_THRESHOLD,
    GamificationService,
    compute_streaks,
    level_for_xp,
)

ACTIVITY_WINDOW_DAYS = 28
SCORE_TREND_LIMIT = 20


def topic_status(mastery: float | None, attempts: int) -> str:
    if attempts == 0 or mastery is None:
        return "not_started"
    if attempts >= MASTERY_MIN_ATTEMPTS and mastery >= MASTERY_THRESHOLD:
        return "mastered"
    if mastery < NEEDS_ATTENTION_THRESHOLD:
        return "needs_attention"
    return "developing"


class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.gamification = GamificationService(db)

    def analytics(self, learner_id: uuid.UUID) -> LearnerAnalytics:
        db = self.db
        g = self.gamification

        lessons = list(db.scalars(select(LessonSession).where(LessonSession.learner_id == learner_id)))
        completed_lessons = [s for s in lessons if s.completed_at is not None]

        rounds = list(
            db.scalars(
                select(AssessmentRound)
                .where(AssessmentRound.learner_id == learner_id, AssessmentRound.status == AssessmentRoundStatus.completed)
                .order_by(AssessmentRound.completed_at)
            )
        )

        attempt_rows = db.execute(
            select(AssessmentAttempt.created_at, AssessmentAttempt.is_correct, AssessmentQuestion.difficulty)
            .join(AssessmentQuestion, AssessmentAttempt.question_id == AssessmentQuestion.id)
            .where(AssessmentAttempt.learner_id == learner_id)
        ).all()
        total_attempts = len(attempt_rows)
        total_correct = sum(1 for row in attempt_rows if row.is_correct)

        progress = {p.topic_id: p for p in db.scalars(select(LearnerProgress).where(LearnerProgress.learner_id == learner_id))}
        topic_rows = db.execute(
            select(Topic, Subject.name).join(Subject, Topic.subject_id == Subject.id).where(Subject.is_active.is_(True))
        ).all()
        known_topic_ids = {topic.id for topic, _ in topic_rows}
        # Progress on a topic whose subject was later archived is still the learner's history.
        for topic_id in set(progress) - known_topic_ids:
            topic = db.get(Topic, topic_id)
            if topic is not None:
                subject = db.get(Subject, topic.subject_id)
                topic_rows.append((topic, subject.name if subject else ""))

        tiers = [DifficultyLevel.beginner, DifficultyLevel.intermediate, DifficultyLevel.advanced]
        mastery_list = []
        for topic, subject_name in sorted(topic_rows, key=lambda r: (r[1], tiers.index(r[0].difficulty), r[0].name)):
            p = progress.get(topic.id)
            attempts = p.attempts_count if p else 0
            mastery = p.mastery_estimate if p and attempts else None
            mastery_list.append(
                TopicMastery(
                    topic_id=topic.id,
                    topic_name=topic.name,
                    subject_name=subject_name,
                    difficulty=topic.difficulty,
                    mastery=mastery,
                    attempts=attempts,
                    correct=p.correct_count if p else 0,
                    status=topic_status(mastery, attempts),  # type: ignore[arg-type]
                    last_activity_at=p.last_activity_at if p else None,
                )
            )

        topic_names = {topic.id: topic.name for topic, _ in topic_rows}
        subject_names = dict(db.execute(select(Subject.id, Subject.name)).all())
        score_trend = [
            ScorePoint(
                round_id=r.id,
                kind=r.kind,
                label=(topic_names.get(r.topic_id) if r.topic_id else None) or subject_names.get(r.subject_id, "Assessment"),
                score=r.score or 0.0,
                correct=r.correct_count,
                total=r.total_count,
                completed_at=r.completed_at,
            )
            for r in rounds[-SCORE_TREND_LIMIT:]
            if r.completed_at is not None
        ]

        today = g.today
        start = today - timedelta(days=ACTIVITY_WINDOW_DAYS - 1)
        answered: dict = defaultdict(int)
        correct: dict = defaultdict(int)
        for row in attempt_rows:
            day = g.local_date(row.created_at)
            if day >= start:
                answered[day] += 1
                correct[day] += int(row.is_correct)
        lessons_by_day: dict = defaultdict(int)
        for s in completed_lessons:
            day = g.local_date(s.completed_at)
            if day >= start:
                lessons_by_day[day] += 1
        daily = [
            DailyActivity(
                date=start + timedelta(days=i),
                questions_answered=answered[start + timedelta(days=i)],
                correct=correct[start + timedelta(days=i)],
                lessons_completed=lessons_by_day[start + timedelta(days=i)],
            )
            for i in range(ACTIVITY_WINDOW_DAYS)
        ]

        by_tier: dict = defaultdict(lambda: [0, 0])
        for row in attempt_rows:
            by_tier[row.difficulty][0] += 1
            by_tier[row.difficulty][1] += int(row.is_correct)
        difficulty_breakdown = [
            DifficultyStat(difficulty=tier, attempts=by_tier[tier][0], correct=by_tier[tier][1]) for tier in tiers if tier in by_tier
        ]

        xp_total = g.total_xp(learner_id)
        current_streak, _ = compute_streaks(g.learning_days(learner_id), today)

        return LearnerAnalytics(
            summary=AnalyticsSummary(
                lessons_completed=len(completed_lessons),
                lessons_generated=sum(1 for s in lessons if s.status.value == "ready"),
                assessments_completed=len(rounds),
                questions_answered=total_attempts,
                overall_accuracy=round(100.0 * total_correct / total_attempts, 1) if total_attempts else None,
                concepts_mastered=sum(1 for m in mastery_list if m.status == "mastered"),
                concepts_needing_attention=sum(1 for m in mastery_list if m.status == "needs_attention"),
                current_streak=current_streak,
                xp_total=xp_total,
                level=level_for_xp(xp_total),
            ),
            score_trend=score_trend,
            daily_activity=daily,
            topic_mastery=mastery_list,
            difficulty_breakdown=difficulty_breakdown,
            mastery_policy=MasteryPolicy(
                mastered_threshold=MASTERY_THRESHOLD,
                needs_attention_threshold=NEEDS_ATTENTION_THRESHOLD,
                min_attempts=MASTERY_MIN_ATTEMPTS,
            ),
            activity_timezone=g.settings.activity_timezone,
        )

    def timeline(self, learner_id: uuid.UUID, limit: int = 30) -> list[TimelineEvent]:
        events = self.db.scalars(
            select(LearningEvent)
            .where(LearningEvent.learner_id == learner_id)
            .order_by(LearningEvent.occurred_at.desc(), LearningEvent.id)
            .limit(limit)
        )
        return [
            TimelineEvent(
                id=e.id,
                event_type=e.event_type,
                title=str((e.details or {}).get("title", e.event_type.value)),
                description=str((e.details or {}).get("description", "")),
                xp_awarded=e.xp_awarded,
                resource_id=e.resource_id,
                occurred_at=e.occurred_at,
            )
            for e in events
        ]
