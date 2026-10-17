"""Assessment question and attempt endpoints.

Question responses never include the correct answer or explanation --
those are only revealed in the AttemptResult after a learner submits an
answer, which is evaluated on the server (see AssessmentService._evaluate).
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.assessment import AssessmentAttempt
from app.schemas.assessment import (
    AttemptCreate,
    AttemptRead,
    AttemptResult,
    QuestionPublic,
)
from app.services.assessment_service import AssessmentService

router = APIRouter(tags=["assessments"])


@router.get("/topics/{topic_id}/questions", response_model=list[QuestionPublic])
def list_topic_questions(topic_id: uuid.UUID, db: Session = Depends(get_db)) -> list[QuestionPublic]:
    questions = AssessmentService(db).list_questions(topic_id)
    return [QuestionPublic.model_validate(q) for q in questions]


@router.post("/assessments/attempts", response_model=AttemptResult, status_code=status.HTTP_201_CREATED)
def submit_attempt(payload: AttemptCreate, db: Session = Depends(get_db)) -> AttemptResult:
    attempt, explanation = AssessmentService(db).submit_attempt(payload)
    return AttemptResult(
        attempt_id=attempt.id,
        question_id=attempt.question_id,
        is_correct=attempt.is_correct,
        score=attempt.score,
        feedback=attempt.feedback,
        explanation=explanation,
        created_at=attempt.created_at,
    )


@router.get("/learners/{learner_id}/assessments", response_model=list[AttemptRead])
def list_learner_attempts(learner_id: uuid.UUID, db: Session = Depends(get_db)) -> list[AttemptRead]:
    stmt = (
        select(AssessmentAttempt)
        .where(AssessmentAttempt.learner_id == learner_id)
        .order_by(AssessmentAttempt.created_at.desc())
    )
    attempts = list(db.scalars(stmt))
    return [AttemptRead.model_validate(a) for a in attempts]
