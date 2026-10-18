"""XP, levels, streaks, achievements, and their notifications.

All rules are defined here and applied only to server-verified events:

XP (see XP_RULES)
- Completing a lesson: 20 XP (lesson must be generated and owned by you).
- Submitting a practice round: 10 XP, plus 5 XP per correct answer on an
  intermediate/advanced question ("challenging" questions).
- Finishing a skills diagnostic: 25 XP.
- Improving on a topic (a practice round scoring higher than your previous
  practice round on that topic): 15 XP.
- Mastering a concept (first time a topic reaches MASTERY_THRESHOLD over at
  least MASTERY_MIN_ATTEMPTS answers): 30 XP.
- Earning an achievement: that achievement's xp_reward.
- Daily limits (DAILY_XP_EVENT_LIMITS) stop repeated lessons/rounds from
  farming XP; the activity is still recorded and still counts for streaks.

Idempotency: each award is a LearningEvent keyed by a stable event_key
derived from the resource (unique per learner), so a retried request can
never award twice.

Levels: reaching level L requires 25 * (L - 1) * L total XP
(L2 = 50, L3 = 150, L4 = 300, L5 = 500, ...).

Streaks: a learning day is a calendar day, in Settings.activity_timezone,
with at least one lesson completion, practice round, or diagnostic. Opening
the app never counts. The current streak is the run of consecutive learning
days ending today -- or ending yesterday, since today isn't over yet.
"""

from __future__ import annotations

import itertools
import uuid
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.assessment import AssessmentRound, AssessmentRoundKind, AssessmentRoundStatus
from app.models.gamification import AchievementDefinition, LearnerAchievement, LearningEvent, LearningEventType
from app.models.learner import Learner
from app.models.lesson import LessonSession
from app.models.notification import Notification, NotificationType
from app.models.progress import LearnerProgress
from app.models.subject import Subject
from app.models.topic import Topic
from app.schemas.gamification import (
    AchievementBrief,
    AchievementStatus,
    ActivityDay,
    GamificationSummary,
    RewardSummary,
    XpRule,
)

LESSON_COMPLETED_XP = 20
PRACTICE_ROUND_XP = 10
CHALLENGE_BONUS_XP = 5
DIAGNOSTIC_COMPLETED_XP = 25
IMPROVEMENT_XP = 15
CONCEPT_MASTERED_XP = 30

DAILY_XP_EVENT_LIMITS = {
    LearningEventType.lesson_completed: 10,
    LearningEventType.practice_round_submitted: 8,
}

STREAK_EVENT_TYPES = frozenset(
    {
        LearningEventType.lesson_completed,
        LearningEventType.practice_round_submitted,
        LearningEventType.diagnostic_completed,
    }
)
STREAK_MILESTONES = (3, 7, 14, 30, 60, 100)

MASTERY_THRESHOLD = 80.0
NEEDS_ATTENTION_THRESHOLD = 60.0
MASTERY_MIN_ATTEMPTS = 3

ACTIVITY_CALENDAR_DAYS = 35

XP_RULES = [
    XpRule(event_type="lesson_completed", label="Complete a lesson", xp=LESSON_COMPLETED_XP,
           note=f"Up to {DAILY_XP_EVENT_LIMITS[LearningEventType.lesson_completed]} rewarded per day"),
    XpRule(event_type="practice_round_submitted", label="Submit a practice round", xp=PRACTICE_ROUND_XP,
           note=f"+{CHALLENGE_BONUS_XP} per correct intermediate/advanced answer; up to "
                f"{DAILY_XP_EVENT_LIMITS[LearningEventType.practice_round_submitted]} rounds rewarded per day"),
    XpRule(event_type="diagnostic_completed", label="Finish a skills diagnostic", xp=DIAGNOSTIC_COMPLETED_XP),
    XpRule(event_type="improvement_demonstrated", label="Beat your previous score on a topic", xp=IMPROVEMENT_XP),
    XpRule(event_type="concept_mastered", label="Master a concept", xp=CONCEPT_MASTERED_XP,
           note=f"{int(MASTERY_THRESHOLD)}%+ accuracy over at least {MASTERY_MIN_ATTEMPTS} answers, once per topic"),
    XpRule(event_type="achievement_earned", label="Unlock an achievement", xp=0, note="Each achievement lists its own bonus"),
]

STREAK_POLICY = (
    "A learning day is any calendar day ({tz}) on which you complete a lesson, submit a practice round, "
    "or finish a diagnostic. Opening EduNex doesn't count. Your streak stays current until the end of "
    "the day after your last learning day."
)


@dataclass(frozen=True)
class AchievementSpec:
    code: str
    title: str
    description: str
    criteria_type: str
    threshold: int
    xp_reward: int


# The canonical definitions, synced into achievement_definitions (see
# ensure_achievement_definitions). Every criteria_type must appear in
# GamificationService._achievement_metrics.
ACHIEVEMENT_SPECS = [
    AchievementSpec("first_lesson", "First Lesson Completed", "Finish your first lesson on the whiteboard.",
                    "lessons_completed", 1, 10),
    AchievementSpec("first_assessment", "First Assessment Submitted", "Submit a practice round or finish a diagnostic.",
                    "assessments_completed", 1, 10),
    AchievementSpec("starting_point", "Starting Point Found", "Complete a skills diagnostic.",
                    "diagnostics_completed", 1, 10),
    AchievementSpec("five_sessions", "Five Learning Sessions",
                    "Complete five learning activities: lessons, practice rounds, or diagnostics.",
                    "learning_sessions", 5, 20),
    AchievementSpec("consistent_learner", "Consistent Learner", "Learn on 3 consecutive days.",
                    "best_streak", 3, 25),
    AchievementSpec("concept_mastered", "Concept Mastered",
                    f"Reach {int(MASTERY_THRESHOLD)}% accuracy on a topic over at least {MASTERY_MIN_ATTEMPTS} answers.",
                    "concepts_mastered", 1, 25),
    AchievementSpec("comeback", "Comeback",
                    "Score 80% or more on a topic after scoring below 60% on it in an earlier round.",
                    "recoveries", 1, 25),
    AchievementSpec("subject_milestone", "Subject Milestone", "Practice every topic in a subject at least once.",
                    "subjects_explored", 1, 30),
]


def xp_for_level(level: int) -> int:
    """Total XP required to reach `level` (level 1 starts at 0)."""
    return 25 * (level - 1) * level


def level_for_xp(xp: int) -> int:
    level = 1
    while xp >= xp_for_level(level + 1):
        level += 1
    return level


def compute_streaks(days: Iterable[date], today: date) -> tuple[int, int]:
    """Returns (current_streak, best_streak) from a set of learning days."""
    unique = sorted(set(days))
    if not unique:
        return 0, 0

    best = run = 1
    for previous, current in itertools.pairwise(unique):
        run = run + 1 if current - previous == timedelta(days=1) else 1
        best = max(best, run)

    last = unique[-1]
    if last < today - timedelta(days=1):
        return 0, best
    current_streak = 1
    for later, earlier in itertools.pairwise(reversed(unique)):
        if later - earlier != timedelta(days=1):
            break
        current_streak += 1
    return current_streak, best


def streak_start(days: Iterable[date], today: date) -> date | None:
    current, _ = compute_streaks(days, today)
    if current == 0:
        return None
    return max(set(days)) - timedelta(days=current - 1)


def ensure_achievement_definitions(db: Session) -> dict[str, AchievementDefinition]:
    """Idempotently syncs ACHIEVEMENT_SPECS into the table (the migration
    seeds them too; this also covers test databases built via create_all)."""
    existing = {d.code: d for d in db.scalars(select(AchievementDefinition))}
    for order, spec in enumerate(ACHIEVEMENT_SPECS):
        definition = existing.get(spec.code)
        if definition is None:
            definition = AchievementDefinition(code=spec.code)
            db.add(definition)
            existing[spec.code] = definition
        definition.title = spec.title
        definition.description = spec.description
        definition.criteria_type = spec.criteria_type
        definition.threshold = spec.threshold
        definition.xp_reward = spec.xp_reward
        definition.sort_order = order
    db.flush()
    return existing


class GamificationService:
    def __init__(self, db: Session, now: datetime | None = None) -> None:
        self.db = db
        self.settings = get_settings()
        self.tz = ZoneInfo(self.settings.activity_timezone)
        self.now = now or datetime.now(UTC)

    # --- dates -----------------------------------------------------------

    @property
    def today(self) -> date:
        return self.now.astimezone(self.tz).date()

    def local_date(self, moment: datetime) -> date:
        if moment.tzinfo is None:  # SQLite returns naive datetimes; they are stored as UTC.
            moment = moment.replace(tzinfo=UTC)
        return moment.astimezone(self.tz).date()

    # --- ledger ------------------------------------------------------------

    def total_xp(self, learner_id: uuid.UUID) -> int:
        return int(
            self.db.scalar(select(func.coalesce(func.sum(LearningEvent.xp_awarded), 0)).where(LearningEvent.learner_id == learner_id))
            or 0
        )

    def find_event(self, learner_id: uuid.UUID, event_key: str) -> LearningEvent | None:
        return self.db.scalar(
            select(LearningEvent).where(LearningEvent.learner_id == learner_id, LearningEvent.event_key == event_key)
        )

    def rewarded_today(self, learner_id: uuid.UUID, event_type: LearningEventType) -> int:
        return int(
            self.db.scalar(
                select(func.count(LearningEvent.id)).where(
                    LearningEvent.learner_id == learner_id,
                    LearningEvent.event_type == event_type,
                    LearningEvent.activity_date == self.today,
                    LearningEvent.xp_awarded > 0,
                )
            )
            or 0
        )

    def record_event(
        self,
        learner_id: uuid.UUID,
        event_type: LearningEventType,
        event_key: str,
        xp: int,
        *,
        title: str,
        description: str,
        resource_id: uuid.UUID | None = None,
        extra: dict[str, Any] | None = None,
    ) -> tuple[LearningEvent, bool]:
        """Records an event once. Returns (event, created). A concurrent
        duplicate surfaces as IntegrityError at flush and is retried by
        app/db/transaction.run_in_transaction."""
        existing = self.find_event(learner_id, event_key)
        if existing is not None:
            return existing, False
        event = LearningEvent(
            learner_id=learner_id,
            event_type=event_type,
            event_key=event_key,
            xp_awarded=xp,
            activity_date=self.today,
            resource_id=resource_id,
            details={"title": title, "description": description, **(extra or {})},
            occurred_at=self.now,
        )
        self.db.add(event)
        self.db.flush()
        return event, True

    def learning_days(self, learner_id: uuid.UUID) -> list[date]:
        return list(
            self.db.scalars(
                select(LearningEvent.activity_date)
                .where(LearningEvent.learner_id == learner_id, LearningEvent.event_type.in_(STREAK_EVENT_TYPES))
                .distinct()
            )
        )

    # --- notifications -------------------------------------------------------

    def notify(
        self,
        recipient_id: uuid.UUID,
        notification_type: NotificationType,
        dedupe_key: str,
        title: str,
        body: str,
        resource_type: str | None = None,
        resource_id: uuid.UUID | None = None,
    ) -> None:
        exists = self.db.scalar(
            select(Notification.id).where(Notification.recipient_id == recipient_id, Notification.dedupe_key == dedupe_key)
        )
        if exists is not None:
            return
        self.db.add(
            Notification(
                recipient_id=recipient_id,
                notification_type=notification_type,
                dedupe_key=dedupe_key,
                title=title,
                body=body,
                resource_type=resource_type,
                resource_id=resource_id,
                created_at=self.now,
            )
        )
        self.db.flush()

    # --- achievements --------------------------------------------------------

    def _achievement_metrics(self, learner_id: uuid.UUID) -> dict[str, int]:
        db = self.db
        lessons_completed = db.scalar(
            select(func.count(LessonSession.id)).where(
                LessonSession.learner_id == learner_id, LessonSession.completed_at.is_not(None)
            )
        )
        completed_rounds = list(
            db.scalars(
                select(AssessmentRound)
                .where(AssessmentRound.learner_id == learner_id, AssessmentRound.status == AssessmentRoundStatus.completed)
                .order_by(AssessmentRound.completed_at)
            )
        )
        diagnostics = sum(1 for r in completed_rounds if r.kind == AssessmentRoundKind.diagnostic)
        learning_sessions = db.scalar(
            select(func.count(LearningEvent.id)).where(
                LearningEvent.learner_id == learner_id, LearningEvent.event_type.in_(STREAK_EVENT_TYPES)
            )
        )
        _, best_streak = compute_streaks(self.learning_days(learner_id), self.today)

        progress = list(db.scalars(select(LearnerProgress).where(LearnerProgress.learner_id == learner_id)))
        mastered = sum(
            1 for p in progress if p.attempts_count >= MASTERY_MIN_ATTEMPTS and p.mastery_estimate >= MASTERY_THRESHOLD
        )

        # Comeback: a practice round >= 80% on a topic whose earlier practice
        # round scored < 60%.
        recoveries = 0
        low_seen: set[uuid.UUID] = set()
        for r in completed_rounds:
            if r.kind != AssessmentRoundKind.practice or r.topic_id is None or r.score is None:
                continue
            if r.score >= 80 and r.topic_id in low_seen:
                recoveries += 1
            if r.score < 60:
                low_seen.add(r.topic_id)

        practiced_topics = {p.topic_id for p in progress if p.attempts_count > 0}
        subjects_explored = 0
        for subject in db.scalars(select(Subject)):
            topic_ids = {t.id for t in db.scalars(select(Topic).where(Topic.subject_id == subject.id))}
            if topic_ids and topic_ids <= practiced_topics:
                subjects_explored += 1

        return {
            "lessons_completed": int(lessons_completed or 0),
            "assessments_completed": len(completed_rounds),
            "diagnostics_completed": diagnostics,
            "learning_sessions": int(learning_sessions or 0),
            "best_streak": best_streak,
            "concepts_mastered": mastered,
            "recoveries": recoveries,
            "subjects_explored": subjects_explored,
        }

    def award_achievements(self, learner_id: uuid.UUID) -> list[AchievementBrief]:
        definitions = ensure_achievement_definitions(self.db)
        earned_ids = set(
            self.db.scalars(select(LearnerAchievement.achievement_id).where(LearnerAchievement.learner_id == learner_id))
        )
        metrics = self._achievement_metrics(learner_id)
        newly: list[AchievementBrief] = []
        for definition in sorted(definitions.values(), key=lambda d: d.sort_order):
            if definition.id in earned_ids:
                continue
            if metrics.get(definition.criteria_type, 0) < definition.threshold:
                continue
            self.db.add(LearnerAchievement(learner_id=learner_id, achievement_id=definition.id, earned_at=self.now))
            self.db.flush()
            self.record_event(
                learner_id,
                LearningEventType.achievement_earned,
                f"achievement:{definition.code}",
                definition.xp_reward,
                title=f"Achievement unlocked: {definition.title}",
                description=definition.description,
                resource_id=definition.id,
                extra={"code": definition.code},
            )
            self.notify(
                learner_id,
                NotificationType.achievement_earned,
                f"achievement:{definition.code}",
                f"Achievement unlocked: {definition.title}",
                definition.description,
                resource_type="achievement",
                resource_id=definition.id,
            )
            newly.append(
                AchievementBrief(
                    code=definition.code,
                    title=definition.title,
                    description=definition.description,
                    xp_reward=definition.xp_reward,
                )
            )
        return newly

    # --- concept mastery -------------------------------------------------------

    def check_concept_mastery(self, learner_id: uuid.UUID, topic_ids: Iterable[uuid.UUID]) -> None:
        for topic_id in set(topic_ids):
            progress = self.db.scalar(
                select(LearnerProgress).where(LearnerProgress.learner_id == learner_id, LearnerProgress.topic_id == topic_id)
            )
            if progress is None or progress.attempts_count < MASTERY_MIN_ATTEMPTS:
                continue
            if progress.mastery_estimate < MASTERY_THRESHOLD:
                continue
            topic = self.db.get(Topic, topic_id)
            name = topic.name if topic else "a topic"
            _, created = self.record_event(
                learner_id,
                LearningEventType.concept_mastered,
                f"mastered:{topic_id}",
                CONCEPT_MASTERED_XP,
                title=f"Mastered {name}",
                description=f"{round(progress.mastery_estimate)}% accuracy over {progress.attempts_count} answers.",
                resource_id=topic_id,
            )
            if created:
                self.notify(
                    learner_id,
                    NotificationType.concept_mastered,
                    f"mastered:{topic_id}",
                    f"You've mastered {name}",
                    f"{round(progress.mastery_estimate)}% accuracy over {progress.attempts_count} answers. "
                    "Keep it fresh with occasional review.",
                    resource_type="topic",
                    resource_id=topic_id,
                )

    # --- summary -----------------------------------------------------------------

    def summary(self, learner_id: uuid.UUID) -> GamificationSummary:
        xp_total = self.total_xp(learner_id)
        level = level_for_xp(xp_total)
        days = self.learning_days(learner_id)
        current, best = compute_streaks(days, self.today)

        window_start = self.today - timedelta(days=ACTIVITY_CALENDAR_DAYS - 1)
        counts = dict(
            self.db.execute(
                select(LearningEvent.activity_date, func.count(LearningEvent.id))
                .where(
                    LearningEvent.learner_id == learner_id,
                    LearningEvent.event_type.in_(STREAK_EVENT_TYPES),
                    LearningEvent.activity_date >= window_start,
                )
                .group_by(LearningEvent.activity_date)
            ).all()
        )
        calendar = [
            ActivityDay(date=window_start + timedelta(days=i), activity_count=int(counts.get(window_start + timedelta(days=i), 0)))
            for i in range(ACTIVITY_CALENDAR_DAYS)
        ]

        definitions = ensure_achievement_definitions(self.db)
        earned = {
            a.achievement_id: a.earned_at
            for a in self.db.scalars(select(LearnerAchievement).where(LearnerAchievement.learner_id == learner_id))
        }
        metrics = self._achievement_metrics(learner_id)
        achievements = [
            AchievementStatus(
                code=d.code,
                title=d.title,
                description=d.description,
                requirement=d.description,
                xp_reward=d.xp_reward,
                earned_at=earned.get(d.id),
                progress_current=min(metrics.get(d.criteria_type, 0), d.threshold),
                progress_target=d.threshold,
            )
            for d in sorted(definitions.values(), key=lambda d: d.sort_order)
            if d.criteria_type in metrics
        ]

        return GamificationSummary(
            xp_total=xp_total,
            level=level,
            level_floor_xp=xp_for_level(level),
            next_level_xp=xp_for_level(level + 1),
            current_streak=current,
            best_streak=best,
            active_today=self.today in set(days),
            last_active_date=max(days) if days else None,
            streak_policy=STREAK_POLICY.format(tz=self.settings.activity_timezone),
            activity_timezone=self.settings.activity_timezone,
            activity_calendar=calendar,
            achievements=achievements,
            xp_rules=XP_RULES,
        )


class RewardSession:
    """Wraps one reward-bearing action: snapshot XP/level before, record
    events during, then evaluate achievements, level-ups, and streak
    milestones once, and report exactly what changed."""

    def __init__(self, db: Session, learner: Learner, now: datetime | None = None) -> None:
        self.service = GamificationService(db, now)
        self.learner = learner
        self.xp_before = self.service.total_xp(learner.id)
        self.level_before = level_for_xp(self.xp_before)
        self.notes: list[str] = []
        self.streak_event_recorded = False

    def award(
        self,
        event_type: LearningEventType,
        event_key: str,
        xp: int,
        *,
        title: str,
        description: str,
        resource_id: uuid.UUID | None = None,
        extra: dict[str, Any] | None = None,
    ) -> tuple[LearningEvent, bool]:
        limit = DAILY_XP_EVENT_LIMITS.get(event_type)
        if limit is not None and xp > 0 and self.service.find_event(self.learner.id, event_key) is None:
            if self.service.rewarded_today(self.learner.id, event_type) >= limit:
                xp = 0
                self.notes.append(
                    "You've reached today's XP limit for this activity -- it still counts toward your streak and progress."
                )
        event, created = self.service.record_event(
            self.learner.id, event_type, event_key, xp,
            title=title, description=description, resource_id=resource_id, extra=extra,
        )
        if created and event_type in STREAK_EVENT_TYPES:
            self.streak_event_recorded = True
        return event, created

    def finish(self) -> RewardSummary:
        svc = self.service
        learner_id = self.learner.id
        new_achievements = svc.award_achievements(learner_id)

        xp_total = svc.total_xp(learner_id)
        level = level_for_xp(xp_total)
        if level > self.level_before:
            svc.notify(
                learner_id,
                NotificationType.level_up,
                f"level:{level}",
                f"You reached level {level}",
                f"{xp_total} XP earned from completed lessons, assessments, and milestones.",
            )

        days = svc.learning_days(learner_id)
        current, _ = compute_streaks(days, svc.today)
        if self.streak_event_recorded and current in STREAK_MILESTONES:
            start = streak_start(days, svc.today)
            svc.notify(
                learner_id,
                NotificationType.streak_milestone,
                f"streak:{current}:{start}",
                f"{current}-day learning streak",
                f"You've learned on {current} consecutive days.",
            )

        return RewardSummary(
            xp_awarded=xp_total - self.xp_before,
            xp_total=xp_total,
            level=level,
            leveled_up=level > self.level_before,
            current_streak=current,
            new_achievements=new_achievements,
            notes=sorted(set(self.notes)),
        )
