"""Adaptive skills diagnostic for onboarding.

Flow: start (per subject) -> the server serves ONE question at a time ->
the learner answers that exact question -> the server evaluates it against
the stored answer key, records an AssessmentAttempt (so it also counts as
real practice evidence in learner_progress), adapts difficulty, and serves
the next question -> after `max_questions` (or when the question bank runs
out) it computes a DiagnosticSummary and stores it on the round.

Adaptive rule (a simple one-step staircase, not item response theory):
- Start at intermediate if the subject has intermediate questions, else at
  the lowest tier available.
- Correct answer -> next question one tier harder; incorrect -> one easier.
- If no unserved question exists at the target tier, use the nearest tier.
- Among candidates, prefer the topic that has been asked about least, so a
  short diagnostic still covers as many concepts as possible.

Classification (per topic, from that diagnostic's answers only):
- demonstrated     >= 80% correct
- developing       >= 50% correct
- needs_attention  <  50% correct
- not_assessed     no questions asked
Any topic with fewer than 2 answers is flagged `limited_evidence`. A short
diagnostic is a starting estimate, not a complete picture of ability.

Prerequisites: the data model has no explicit prerequisite graph. Within a
subject, topics at a lower difficulty tier are treated as foundations for
higher tiers (the same assumption recommendation_service makes when it
advances a learner); a foundational topic that needs attention is reported
as a prerequisite gap.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, NotFoundError, ValidationAppError
from app.db.transaction import run_in_transaction
from app.models.assessment import (
    AssessmentAttempt,
    AssessmentQuestion,
    AssessmentRound,
    AssessmentRoundKind,
    AssessmentRoundStatus,
)
from app.models.gamification import LearningEventType
from app.models.learner import Learner, LearnerRole, OnboardingStatus
from app.models.notification import NotificationType
from app.models.subject import Subject
from app.models.topic import DifficultyLevel, Topic
from app.schemas.assessment import AttemptResult, QuestionPublic
from app.schemas.diagnostic import (
    DiagnosticAnswer,
    DiagnosticAnswerResult,
    DiagnosticCoverage,
    DiagnosticListItem,
    DiagnosticRecommendation,
    DiagnosticState,
    DiagnosticSummary,
    DifficultyBreakdown,
    TopicDiagnosis,
)
from app.services.assessment_service import AssessmentService, feedback_for
from app.services.gamification_service import DIAGNOSTIC_COMPLETED_XP, RewardSession
from app.services.progress_service import ProgressService
from app.services.skill_service import record_snapshots

DIAGNOSTIC_MAX_QUESTIONS = 8
LIMITED_EVIDENCE_TOTAL = 5
LIMITED_EVIDENCE_PER_TOPIC = 2
DEMONSTRATED_ACCURACY = 80.0
DEVELOPING_ACCURACY = 50.0
START_DIFFICULTY_ACCURACY = 60.0

TIERS = [DifficultyLevel.beginner, DifficultyLevel.intermediate, DifficultyLevel.advanced]
TIER_INDEX = {tier: i for i, tier in enumerate(TIERS)}

PREREQUISITE_RULE = (
    "EduNex treats lower-difficulty topics in a subject as foundations for the harder ones. "
    "A foundational topic that needs attention is listed as a prerequisite gap."
)


def _step(difficulty: DifficultyLevel, correct: bool) -> DifficultyLevel:
    index = TIER_INDEX[difficulty] + (1 if correct else -1)
    return TIERS[max(0, min(len(TIERS) - 1, index))]


def select_next_question(
    pool: list[AssessmentQuestion], served: set[uuid.UUID], target: DifficultyLevel, served_per_topic: dict[uuid.UUID, int]
) -> AssessmentQuestion | None:
    candidates = [q for q in pool if q.id not in served]
    if not candidates:
        return None
    return min(
        candidates,
        key=lambda q: (
            abs(TIER_INDEX[q.difficulty] - TIER_INDEX[target]),
            # On a tie in distance, prefer the easier tier -- a struggling
            # learner shouldn't be bumped up just because a tier ran out.
            TIER_INDEX[q.difficulty],
            served_per_topic.get(q.topic_id, 0),
            q.created_at,
            str(q.id),
        ),
    )


def _status_for(accuracy: float) -> str:
    if accuracy >= DEMONSTRATED_ACCURACY:
        return "demonstrated"
    if accuracy >= DEVELOPING_ACCURACY:
        return "developing"
    return "needs_attention"


def build_summary(
    subject: Subject, topics: list[Topic], answered: list[tuple[AssessmentQuestion, bool]]
) -> DiagnosticSummary:
    per_topic: dict[uuid.UUID, list[bool]] = defaultdict(list)
    per_tier: dict[DifficultyLevel, list[bool]] = defaultdict(list)
    for question, is_correct in answered:
        per_topic[question.topic_id].append(is_correct)
        per_tier[question.difficulty].append(is_correct)

    diagnoses: list[TopicDiagnosis] = []
    for topic in sorted(topics, key=lambda t: (TIER_INDEX[t.difficulty], t.name)):
        results = per_topic.get(topic.id, [])
        if not results:
            diagnoses.append(
                TopicDiagnosis(
                    topic_id=topic.id, topic_name=topic.name, topic_difficulty=topic.difficulty,
                    attempted=0, correct=0, accuracy=None, status="not_assessed", limited_evidence=True,
                )
            )
            continue
        accuracy = round(100.0 * sum(results) / len(results), 1)
        diagnoses.append(
            TopicDiagnosis(
                topic_id=topic.id, topic_name=topic.name, topic_difficulty=topic.difficulty,
                attempted=len(results), correct=sum(results), accuracy=accuracy,
                status=_status_for(accuracy),  # type: ignore[arg-type]
                limited_evidence=len(results) < LIMITED_EVIDENCE_PER_TOPIC,
            )
        )

    highest_tier = max((TIER_INDEX[t.difficulty] for t in topics), default=0)
    prerequisite_gaps = [
        d.topic_id for d in diagnoses if d.status == "needs_attention" and TIER_INDEX[d.topic_difficulty] < highest_tier
    ]

    by_difficulty = [
        DifficultyBreakdown(difficulty=tier, attempted=len(per_tier[tier]), correct=sum(per_tier[tier]))
        for tier in TIERS
        if per_tier.get(tier)
    ]

    # Starting difficulty: the easiest assessed tier below 60% -- that's where
    # learning is needed. If every assessed tier is at/above 60%, start one
    # tier above the hardest one assessed.
    recommended_difficulty = DifficultyLevel.beginner
    reason = "No questions were answered, so EduNex starts at the beginning."
    assessed = [b for b in by_difficulty if b.attempted]
    weak_tiers = [b for b in assessed if 100.0 * b.correct / b.attempted < START_DIFFICULTY_ACCURACY]
    if weak_tiers:
        weakest = min(weak_tiers, key=lambda b: TIER_INDEX[b.difficulty])
        recommended_difficulty = weakest.difficulty
        reason = (
            f"You answered {weakest.correct}/{weakest.attempted} {weakest.difficulty.value} questions correctly, "
            f"so that's the level to build from."
        )
    elif assessed:
        hardest = max(assessed, key=lambda b: TIER_INDEX[b.difficulty])
        recommended_difficulty = _step(hardest.difficulty, True)
        if recommended_difficulty == hardest.difficulty:
            reason = (
                f"You answered {hardest.correct}/{hardest.attempted} {hardest.difficulty.value} questions correctly "
                "-- the hardest level available."
            )
        else:
            reason = (
                f"You answered {hardest.correct}/{hardest.attempted} {hardest.difficulty.value} questions correctly, "
                f"so you're ready to try {recommended_difficulty.value} material."
            )

    recommendation = _recommend(diagnoses, recommended_difficulty, prerequisite_gaps)

    correct = sum(1 for _, ok in answered if ok)
    total = len(answered)
    topics_assessed = sum(1 for d in diagnoses if d.status != "not_assessed")
    limited = total < LIMITED_EVIDENCE_TOTAL or any(d.limited_evidence for d in diagnoses if d.status != "not_assessed")
    if total == 0:
        note = "No questions were answered."
    elif limited:
        note = (
            f"Based on {total} question{'s' if total != 1 else ''} across {topics_assessed} of {len(topics)} topic"
            f"{'s' if len(topics) != 1 else ''}. Treat this as a starting estimate -- practice will sharpen it."
        )
    else:
        note = f"Based on {total} questions across {topics_assessed} of {len(topics)} topics."

    return DiagnosticSummary(
        subject_id=subject.id,
        subject_name=subject.name,
        overall_score=round(100.0 * correct / total, 1) if total else 0.0,
        correct=correct,
        total=total,
        topics=diagnoses,
        prerequisite_gaps=prerequisite_gaps,
        prerequisite_rule=PREREQUISITE_RULE,
        by_difficulty=by_difficulty,
        recommended_difficulty=recommended_difficulty,
        recommended_difficulty_reason=reason,
        recommendation=recommendation,
        coverage=DiagnosticCoverage(
            questions_answered=total,
            topics_assessed=topics_assessed,
            topics_total=len(topics),
            limited_evidence=limited,
            note=note,
        ),
    )


def _recommend(
    diagnoses: list[TopicDiagnosis], difficulty: DifficultyLevel, prerequisite_gaps: list[uuid.UUID]
) -> DiagnosticRecommendation | None:
    def rec(d: TopicDiagnosis, activity: str, reason: str) -> DiagnosticRecommendation:
        return DiagnosticRecommendation(
            topic_id=d.topic_id, topic_name=d.topic_name, difficulty=d.topic_difficulty, activity=activity, reason=reason  # type: ignore[arg-type]
        )

    gaps = [d for d in diagnoses if d.topic_id in prerequisite_gaps]
    if gaps:
        d = min(gaps, key=lambda d: (TIER_INDEX[d.topic_difficulty], d.accuracy or 0))
        return rec(d, "lesson", f"{d.topic_name} is a foundation for later topics and you answered {d.correct}/{d.attempted} correctly.")

    weak = [d for d in diagnoses if d.status == "needs_attention"]
    if weak:
        d = min(weak, key=lambda d: (d.accuracy or 0, TIER_INDEX[d.topic_difficulty]))
        return rec(
            d, "lesson", f"You answered {d.correct}/{d.attempted} {d.topic_name} questions correctly -- a lesson is the best next step."
        )

    developing = [d for d in diagnoses if d.status == "developing"]
    if developing:
        d = min(developing, key=lambda d: (d.accuracy or 0, TIER_INDEX[d.topic_difficulty]))
        return rec(d, "practice", f"You're partway there on {d.topic_name} ({d.correct}/{d.attempted}) -- practice will close the gap.")

    unassessed = [d for d in diagnoses if d.status == "not_assessed"]
    if unassessed:
        d = min(unassessed, key=lambda d: abs(TIER_INDEX[d.topic_difficulty] - TIER_INDEX[difficulty]))
        return rec(d, "lesson", f"The diagnostic didn't cover {d.topic_name} yet; it's the closest match to your starting level.")

    if diagnoses:
        d = max(diagnoses, key=lambda d: TIER_INDEX[d.topic_difficulty])
        return rec(d, "practice", f"You demonstrated every assessed topic. Harder practice on {d.topic_name} keeps you progressing.")
    return None


class DiagnosticService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # --- reads -------------------------------------------------------------

    def _subject_pool(self, subject_id: uuid.UUID) -> tuple[Subject, list[Topic], list[AssessmentQuestion]]:
        subject = self.db.get(Subject, subject_id)
        if subject is None or not subject.is_active:
            raise NotFoundError(f"Subject {subject_id} was not found")
        topics = list(self.db.scalars(select(Topic).where(Topic.subject_id == subject.id)))
        pool = list(
            self.db.scalars(
                select(AssessmentQuestion).where(
                    AssessmentQuestion.topic_id.in_([t.id for t in topics]), AssessmentQuestion.review_status != "rejected"
                )
            )
        ) if topics else []
        return subject, topics, pool

    def get_owned(self, round_id: uuid.UUID, current: Learner) -> AssessmentRound:
        round_ = self.db.get(AssessmentRound, round_id)
        if round_ is None or round_.kind != AssessmentRoundKind.diagnostic:
            raise NotFoundError(f"Diagnostic {round_id} was not found")
        if round_.learner_id != current.id and current.role != LearnerRole.admin:
            raise ForbiddenError("You do not have permission to access this diagnostic.")
        return round_

    def state(self, round_: AssessmentRound) -> DiagnosticState:
        subject = self.db.get(Subject, round_.subject_id) if round_.subject_id else None
        question = self.db.get(AssessmentQuestion, round_.pending_question_id) if round_.pending_question_id else None
        topic = self.db.get(Topic, question.topic_id) if question else None
        return DiagnosticState(
            id=round_.id,
            subject_id=round_.subject_id,
            subject_name=subject.name if subject else "",
            status=round_.status,
            answered_count=round_.total_count,
            correct_count=round_.correct_count,
            max_questions=round_.max_questions,
            current_difficulty=round_.current_difficulty,
            question=QuestionPublic.model_validate(question) if question else None,
            question_topic_name=topic.name if topic else None,
            summary=DiagnosticSummary.model_validate(round_.summary) if round_.summary else None,
            created_at=round_.created_at,
            completed_at=round_.completed_at,
        )

    def list_for_learner(self, learner_id: uuid.UUID) -> list[DiagnosticListItem]:
        rounds = self.db.scalars(
            select(AssessmentRound)
            .where(AssessmentRound.learner_id == learner_id, AssessmentRound.kind == AssessmentRoundKind.diagnostic)
            .order_by(AssessmentRound.created_at.desc())
        )
        items = []
        for r in rounds:
            subject = self.db.get(Subject, r.subject_id) if r.subject_id else None
            items.append(
                DiagnosticListItem(
                    id=r.id, subject_id=r.subject_id, subject_name=subject.name if subject else "",
                    status=r.status, score=r.score, answered_count=r.total_count,
                    created_at=r.created_at, completed_at=r.completed_at,
                )
            )
        return items

    # --- writes ------------------------------------------------------------

    def start(self, learner: Learner, subject_id: uuid.UUID) -> DiagnosticState:
        return run_in_transaction(self.db, lambda: self._start(learner, subject_id))

    def _start(self, learner: Learner, subject_id: uuid.UUID) -> DiagnosticState:
        subject, _, pool = self._subject_pool(subject_id)
        existing = self.db.scalar(
            select(AssessmentRound).where(
                AssessmentRound.learner_id == learner.id,
                AssessmentRound.kind == AssessmentRoundKind.diagnostic,
                AssessmentRound.subject_id == subject.id,
                AssessmentRound.status == AssessmentRoundStatus.in_progress,
            )
        )
        if existing is not None:
            return self.state(existing)  # resume rather than restart

        if not pool:
            raise ValidationAppError(
                f"{subject.name} has no assessment questions yet, so a diagnostic can't be run for it."
            )

        tiers_available = {q.difficulty for q in pool}
        start_tier = (
            DifficultyLevel.intermediate
            if DifficultyLevel.intermediate in tiers_available
            else min(tiers_available, key=lambda t: TIER_INDEX[t])
        )
        first = select_next_question(pool, set(), start_tier, {})
        round_ = AssessmentRound(
            learner_id=learner.id,
            kind=AssessmentRoundKind.diagnostic,
            status=AssessmentRoundStatus.in_progress,
            subject_id=subject.id,
            current_difficulty=start_tier,
            pending_question_id=first.id if first else None,
            served_question_ids=[str(first.id)] if first else [],
            max_questions=min(DIAGNOSTIC_MAX_QUESTIONS, len(pool)),
        )
        self.db.add(round_)
        if learner.onboarding_status in (OnboardingStatus.not_started, OnboardingStatus.skipped):
            learner.onboarding_status = OnboardingStatus.in_progress
        self.db.flush()
        return self.state(round_)

    def answer(self, learner: Learner, round_id: uuid.UUID, data: DiagnosticAnswer) -> DiagnosticAnswerResult:
        return run_in_transaction(self.db, lambda: self._answer(learner, round_id, data))

    def _answer(self, learner: Learner, round_id: uuid.UUID, data: DiagnosticAnswer) -> DiagnosticAnswerResult:
        round_ = self.db.get(AssessmentRound, round_id)
        if round_ is None or round_.kind != AssessmentRoundKind.diagnostic or round_.learner_id != learner.id:
            # Only the learner taking a diagnostic can answer it.
            raise NotFoundError(f"Diagnostic {round_id} was not found")
        if round_.status == AssessmentRoundStatus.completed:
            raise ValidationAppError("This diagnostic is already complete.")
        if round_.pending_question_id != data.question_id:
            raise ValidationAppError("That isn't the current diagnostic question. Reload to continue where you left off.")

        question = self.db.get(AssessmentQuestion, data.question_id)
        if question is None:
            raise NotFoundError(f"Question {data.question_id} was not found")
        is_correct = AssessmentService._evaluate(question, data.submitted_answer)

        now = datetime.now(UTC)
        attempt = AssessmentAttempt(
            learner_id=learner.id,
            question_id=question.id,
            round_id=round_.id,
            submitted_answer=data.submitted_answer,
            is_correct=is_correct,
            score=100.0 if is_correct else 0.0,
            feedback=feedback_for(is_correct),
            created_at=now,
        )
        self.db.add(attempt)
        ProgressService(self.db).apply_attempt(learner.id, question.topic_id, is_correct, at=now)

        round_.total_count += 1
        round_.correct_count += int(is_correct)
        round_.current_difficulty = _step(question.difficulty, is_correct)

        subject, topics, pool = self._subject_pool(round_.subject_id)
        served = {uuid.UUID(q) for q in round_.served_question_ids}
        next_question = None
        if round_.total_count < round_.max_questions:
            served_per_topic: dict[uuid.UUID, int] = defaultdict(int)
            for q in pool:
                if q.id in served:
                    served_per_topic[q.topic_id] += 1
            next_question = select_next_question(pool, served, round_.current_difficulty, served_per_topic)

        rewards_summary = None
        if next_question is None:
            rewards_summary = self._complete(learner, round_, subject, topics, now)
        else:
            round_.pending_question_id = next_question.id
            round_.served_question_ids = [*round_.served_question_ids, str(next_question.id)]
        self.db.flush()

        return DiagnosticAnswerResult(
            attempt=AttemptResult(
                attempt_id=attempt.id,
                question_id=question.id,
                is_correct=is_correct,
                score=attempt.score,
                feedback=attempt.feedback,
                explanation=question.explanation,
                created_at=now,
            ),
            state=self.state(round_),
            rewards=rewards_summary,
        )

    def _complete(self, learner: Learner, round_: AssessmentRound, subject: Subject, topics: list[Topic], now: datetime):
        self.db.flush()
        attempts = list(
            self.db.scalars(select(AssessmentAttempt).where(AssessmentAttempt.round_id == round_.id))
        )
        questions = {q.id: q for q in self.db.scalars(
            select(AssessmentQuestion).where(AssessmentQuestion.id.in_([a.question_id for a in attempts]))
        )}
        answered = [(questions[a.question_id], a.is_correct) for a in attempts if a.question_id in questions]
        summary = build_summary(subject, topics, answered)

        round_.status = AssessmentRoundStatus.completed
        round_.pending_question_id = None
        round_.completed_at = now
        round_.score = summary.overall_score
        round_.summary = summary.model_dump(mode="json")
        learner.onboarding_status = OnboardingStatus.completed
        by_topic: dict[uuid.UUID, list[bool]] = defaultdict(list)
        for question, is_correct in answered:
            by_topic[question.topic_id].append(is_correct)
        record_snapshots(self.db, learner.id, round_.id, by_topic)

        rewards = RewardSession(self.db, learner, now)
        rewards.award(
            LearningEventType.diagnostic_completed,
            f"diagnostic:{round_.id}",
            DIAGNOSTIC_COMPLETED_XP,
            title=f"Skills diagnostic: {subject.name}",
            description=f"{summary.correct}/{summary.total} correct.",
            resource_id=round_.id,
            extra={"score": summary.overall_score},
        )
        rewards.service.notify(
            learner.id,
            NotificationType.diagnostic_results,
            f"diagnostic:{round_.id}",
            f"Your {subject.name} diagnostic results are ready",
            summary.recommendation.reason if summary.recommendation else summary.coverage.note,
            resource_type="diagnostic",
            resource_id=round_.id,
        )
        rewards.service.check_concept_mastery(learner.id, {q.topic_id for q, _ in answered})
        return rewards.finish()
