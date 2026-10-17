"""Assessment question listing and server-side answer evaluation.

Correctness is always computed here by comparing the submitted answer to
`AssessmentQuestion.correct_answer` -- the frontend never supplies (and is
never trusted for) a correctness flag or score.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationAppError
from app.models.assessment import AssessmentAttempt, AssessmentQuestion, QuestionType
from app.models.learner import Learner
from app.models.topic import Topic
from app.schemas.assessment import AttemptCreate
from app.services.progress_service import ProgressService


class AssessmentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_questions(self, topic_id: uuid.UUID) -> list[AssessmentQuestion]:
        topic = self.db.get(Topic, topic_id)
        if topic is None:
            raise NotFoundError(f"Topic {topic_id} was not found")
        stmt = select(AssessmentQuestion).where(AssessmentQuestion.topic_id == topic_id)
        return list(self.db.scalars(stmt))

    def submit_attempt(self, learner: Learner, data: AttemptCreate) -> tuple[AssessmentAttempt, str]:
        question = self.db.get(AssessmentQuestion, data.question_id)
        if question is None:
            raise NotFoundError(f"Question {data.question_id} was not found")

        is_correct = self._evaluate(question, data.submitted_answer)
        score = 100.0 if is_correct else 0.0

        attempt = AssessmentAttempt(
            learner_id=learner.id,
            question_id=data.question_id,
            submitted_answer=data.submitted_answer,
            is_correct=is_correct,
            score=score,
            feedback="Correct!" if is_correct else "Not quite -- see the explanation below.",
        )
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)

        ProgressService(self.db).record_attempt(learner.id, question.topic_id, is_correct)

        return attempt, question.explanation

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
