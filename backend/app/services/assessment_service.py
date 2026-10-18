"""Assessment question listing and server-side answer evaluation.

Correctness is always computed here by comparing the submitted answer to
`AssessmentQuestion.correct_answer` -- the frontend never supplies (and is
never trusted for) a correctness flag or score.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationAppError
from app.db.transaction import run_in_transaction
from app.models.assessment import (
    AssessmentAttempt,
    AssessmentQuestion,
    AssessmentRound,
    AssessmentRoundKind,
    AssessmentRoundStatus,
    QuestionType,
)
from app.models.gamification import LearningEventType
from app.models.learner import Learner
from app.models.topic import DifficultyLevel, Topic
from app.schemas.assessment import AttemptCreate, PracticeRoundCreate, PracticeRoundResult, RoundQuestionResult
from app.services.gamification_service import (
    CHALLENGE_BONUS_XP,
    IMPROVEMENT_XP,
    PRACTICE_ROUND_XP,
    RewardSession,
)
from app.services.progress_service import ProgressService
from app.services.skill_service import record_snapshots

CHALLENGING_DIFFICULTIES = frozenset({DifficultyLevel.intermediate, DifficultyLevel.advanced})


def feedback_for(is_correct: bool) -> str:
    return "Correct!" if is_correct else "Not quite -- see the explanation below."


class AssessmentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_questions(
        self, topic_id: uuid.UUID, *, learner: Learner | None = None, limit: int | None = None
    ) -> list[AssessmentQuestion]:
        """Returns approved, non-seeded questions, preferring unseen items for learners."""
        topic = self.db.get(Topic, topic_id)
        if topic is None:
            raise NotFoundError(f"Topic {topic_id} was not found")
        stmt = (
            select(AssessmentQuestion)
            .where(
                AssessmentQuestion.topic_id == topic_id,
                AssessmentQuestion.review_status == "approved",
                AssessmentQuestion.origin != "seeded",
            )
            .order_by(AssessmentQuestion.created_at, AssessmentQuestion.id)
        )
        questions = list(self.db.scalars(stmt))
        if learner is not None:
            last_seen = dict(
                self.db.execute(
                    select(AssessmentAttempt.question_id, func.max(AssessmentAttempt.created_at))
                    .where(AssessmentAttempt.learner_id == learner.id)
                    .group_by(AssessmentAttempt.question_id)
                ).all()
            )
            questions.sort(key=lambda q: (q.id in last_seen, str(last_seen.get(q.id) or "")))
        return questions[:limit] if limit else questions

    def submit_attempt(self, learner: Learner, data: AttemptCreate) -> tuple[AssessmentAttempt, str]:
        question = self.db.get(AssessmentQuestion, data.question_id)
        if question is None:
            raise NotFoundError(f"Question {data.question_id} was not found")
        if question.origin == "seeded" or question.review_status != "approved":
            raise NotFoundError(f"Question {data.question_id} is not available for practice")

        is_correct = self._evaluate(question, data.submitted_answer)
        score = 100.0 if is_correct else 0.0

        attempt = AssessmentAttempt(
            learner_id=learner.id,
            question_id=data.question_id,
            submitted_answer=data.submitted_answer,
            is_correct=is_correct,
            score=score,
            feedback=feedback_for(is_correct),
        )
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)

        ProgressService(self.db).record_attempt(learner.id, question.topic_id, is_correct)

        return attempt, question.explanation

    # --- practice rounds ---------------------------------------------------

    def submit_practice_round(self, learner: Learner, data: PracticeRoundCreate) -> PracticeRoundResult:
        """Evaluates and records a whole practice round in one transaction,
        then awards XP/achievements for it. Idempotent on client_request_id."""
        return run_in_transaction(self.db, lambda: self._submit_practice_round(learner, data))

    def _submit_practice_round(self, learner: Learner, data: PracticeRoundCreate) -> PracticeRoundResult:
        existing = self.db.scalar(
            select(AssessmentRound).where(
                AssessmentRound.learner_id == learner.id, AssessmentRound.client_request_id == data.client_request_id
            )
        )
        if existing is not None:
            return self._round_result(existing, previous_score=None, rewards=None, replayed=True)

        topic = self.db.get(Topic, data.topic_id)
        if topic is None:
            raise NotFoundError(f"Topic {data.topic_id} was not found")

        question_ids = [a.question_id for a in data.answers]
        if len(set(question_ids)) != len(question_ids):
            raise ValidationAppError("Each question may only be answered once per round.")
        questions = {
            q.id: q
            for q in self.db.scalars(
                select(AssessmentQuestion).where(
                    AssessmentQuestion.id.in_(question_ids),
                    AssessmentQuestion.review_status == "approved",
                    AssessmentQuestion.origin != "seeded",
                )
            )
        }
        for question_id in question_ids:
            question = questions.get(question_id)
            if question is None:
                raise NotFoundError(f"Question {question_id} was not found")
            if question.topic_id != topic.id:
                raise ValidationAppError("Every question in a practice round must belong to the round's topic.")

        # Validate every answer before writing anything.
        evaluated = [(questions[a.question_id], a.submitted_answer, self._evaluate(questions[a.question_id], a.submitted_answer))
                     for a in data.answers]

        now = datetime.now(UTC)
        previous = self.db.scalar(
            select(AssessmentRound)
            .where(
                AssessmentRound.learner_id == learner.id,
                AssessmentRound.kind == AssessmentRoundKind.practice,
                AssessmentRound.topic_id == topic.id,
                AssessmentRound.status == AssessmentRoundStatus.completed,
            )
            .order_by(AssessmentRound.completed_at.desc())
            .limit(1)
        )
        rewards = RewardSession(self.db, learner, now)

        correct = sum(1 for _, _, ok in evaluated if ok)
        total = len(evaluated)
        round_ = AssessmentRound(
            learner_id=learner.id,
            kind=AssessmentRoundKind.practice,
            status=AssessmentRoundStatus.completed,
            subject_id=topic.subject_id,
            topic_id=topic.id,
            client_request_id=data.client_request_id,
            served_question_ids=[str(q.id) for q, _, _ in evaluated],
            max_questions=total,
            correct_count=correct,
            total_count=total,
            score=round(100.0 * correct / total, 2),
            completed_at=now,
        )
        self.db.add(round_)
        self.db.flush()

        progress = ProgressService(self.db)
        challenge_correct = 0
        for question, answer, is_correct in evaluated:
            self.db.add(
                AssessmentAttempt(
                    learner_id=learner.id,
                    question_id=question.id,
                    round_id=round_.id,
                    submitted_answer=answer,
                    is_correct=is_correct,
                    score=100.0 if is_correct else 0.0,
                    feedback=feedback_for(is_correct),
                )
            )
            progress.apply_attempt(learner.id, topic.id, is_correct, at=now)
            if is_correct and question.difficulty in CHALLENGING_DIFFICULTIES:
                challenge_correct += 1
        self.db.flush()
        record_snapshots(self.db, learner.id, round_.id, {topic.id: [ok for _, _, ok in evaluated]})

        score_pct = round(round_.score or 0)
        rewards.award(
            LearningEventType.practice_round_submitted,
            f"round:{round_.id}",
            PRACTICE_ROUND_XP + CHALLENGE_BONUS_XP * challenge_correct,
            title=f"Practice round: {topic.name}",
            description=f"{correct}/{total} correct ({score_pct}%).",
            resource_id=round_.id,
            extra={"score": round_.score, "challenge_correct": challenge_correct},
        )
        previous_score = previous.score if previous is not None else None
        if previous_score is not None and (round_.score or 0) > previous_score:
            rewards.award(
                LearningEventType.improvement_demonstrated,
                f"improvement:{round_.id}",
                IMPROVEMENT_XP,
                title=f"Improved on {topic.name}",
                description=f"{round(previous_score)}% → {score_pct}% compared with your previous round.",
                resource_id=round_.id,
                extra={"previous_score": previous_score, "score": round_.score},
            )
        rewards.service.check_concept_mastery(learner.id, [topic.id])
        summary = rewards.finish()

        return self._round_result(round_, previous_score=previous_score, rewards=summary, replayed=False)

    def _round_result(
        self, round_: AssessmentRound, *, previous_score: float | None, rewards, replayed: bool
    ) -> PracticeRoundResult:
        topic = self.db.get(Topic, round_.topic_id) if round_.topic_id else None
        attempts = list(
            self.db.scalars(
                select(AssessmentAttempt).where(AssessmentAttempt.round_id == round_.id).order_by(AssessmentAttempt.created_at)
            )
        )
        by_question = {a.question_id: a for a in attempts}
        results = []
        for question_id in round_.served_question_ids:
            question = self.db.get(AssessmentQuestion, uuid.UUID(question_id))
            attempt = by_question.get(uuid.UUID(question_id))
            if question is None or attempt is None:
                continue
            results.append(
                RoundQuestionResult(
                    question_id=question.id,
                    is_correct=attempt.is_correct,
                    explanation=question.explanation,
                    difficulty=question.difficulty,
                )
            )
        return PracticeRoundResult(
            round_id=round_.id,
            topic_id=round_.topic_id,
            topic_name=topic.name if topic else "",
            correct=round_.correct_count,
            total=round_.total_count,
            score=round_.score or 0.0,
            previous_score=previous_score,
            results=results,
            completed_at=round_.completed_at or round_.created_at,
            replayed=replayed,
            rewards=rewards,
        )

    @staticmethod
    def _evaluate(question: AssessmentQuestion, submitted_answer: int | bool) -> bool:
        if question.question_type == QuestionType.multiple_choice:
            if isinstance(submitted_answer, bool) or not isinstance(submitted_answer, int):
                raise ValidationAppError("This question expects an option index (integer).")
            if question.options and not (0 <= submitted_answer < len(question.options)):
                raise ValidationAppError("submitted_answer is out of range for this question's options.")
            return submitted_answer == question.correct_answer

        if question.question_type == QuestionType.true_false:
            if not isinstance(submitted_answer, bool):
                raise ValidationAppError("This question expects a boolean (true/false) answer.")
            return submitted_answer == question.correct_answer

        raise ValidationAppError(f"Unsupported question type: {question.question_type}")
