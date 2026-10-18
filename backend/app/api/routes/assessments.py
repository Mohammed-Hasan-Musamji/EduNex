"""Assessment question and attempt endpoints.

Question responses never include the correct answer or explanation --
those are only revealed in the AttemptResult after a learner submits an
answer, which is evaluated on the server (see AssessmentService._evaluate).
learner_id is never accepted from the client for submission -- it is always
the authenticated caller.
"""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient, get_gemini_client
from app.api.deps import get_current_learner, get_db, get_optional_learner, verify_owner_or_admin
from app.core.rate_limit import SlidingWindowLimiter
from app.models.assessment import AssessmentAttempt
from app.models.learner import Learner
from app.schemas.assessment import (
    AttemptCreate,
    AttemptRead,
    AttemptResult,
    PracticeQuestionGenerationResult,
    PracticeRoundCreate,
    PracticeRoundResult,
    QuestionPublic,
)
from app.services.assessment_service import AssessmentService
from app.services.question_generation import generate_for_topic

router = APIRouter(tags=["assessments"])
generate_limiter = SlidingWindowLimiter(limit=5, window_seconds=60)


@router.get("/topics/{topic_id}/questions", response_model=list[QuestionPublic])
def list_topic_questions(
    topic_id: uuid.UUID,
    limit: int | None = Query(default=None, ge=1, le=50),
    db: Session = Depends(get_db),
    learner: Learner | None = Depends(get_optional_learner),
) -> list[QuestionPublic]:
    questions = AssessmentService(db).list_questions(topic_id, learner=learner, limit=limit)
    return [QuestionPublic.model_validate(q) for q in questions]


@router.post("/topics/{topic_id}/questions/generate", response_model=PracticeQuestionGenerationResult)
def generate_practice_questions(
    topic_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: Learner = Depends(get_current_learner),
    gemini: GeminiClient = Depends(get_gemini_client),
) -> PracticeQuestionGenerationResult:
    generate_limiter.check(str(current.id))
    report = generate_for_topic(
        db,
        gemini,
        topic_id,
        excerpts=4,
        per_excerpt=2,
        review_status="approved",
    )
    return PracticeQuestionGenerationResult(
        topic_id=report.topic_id,
        accepted=report.accepted,
        rejected_invalid=report.rejected_invalid,
        rejected_duplicate=report.rejected_duplicate,
    )


@router.post("/assessments/attempts", response_model=AttemptResult, status_code=status.HTTP_201_CREATED)
def submit_attempt(
    payload: AttemptCreate,
    db: Session = Depends(get_db),
    current: Learner = Depends(get_current_learner),
) -> AttemptResult:
    attempt, explanation = AssessmentService(db).submit_attempt(current, payload)
    return AttemptResult(
        attempt_id=attempt.id,
        question_id=attempt.question_id,
        is_correct=attempt.is_correct,
        score=attempt.score,
        feedback=attempt.feedback,
        explanation=explanation,
        created_at=attempt.created_at,
    )


@router.post("/assessments/rounds", response_model=PracticeRoundResult, status_code=status.HTTP_201_CREATED)
def submit_practice_round(
    payload: PracticeRoundCreate,
    db: Session = Depends(get_db),
    current: Learner = Depends(get_current_learner),
) -> PracticeRoundResult:
    """Grades a whole practice round on the server, records it, and awards
    XP/achievements once. Retrying with the same client_request_id replays
    the stored result (replayed=true, rewards=null)."""
    return AssessmentService(db).submit_practice_round(current, payload)


@router.get("/learners/{learner_id}/assessments", response_model=list[AttemptRead])
def list_learner_attempts(
    learner_id: uuid.UUID, db: Session = Depends(get_db), _: Learner = Depends(verify_owner_or_admin)
) -> list[AttemptRead]:
    stmt = (
        select(AssessmentAttempt)
        .where(AssessmentAttempt.learner_id == learner_id)
        .order_by(AssessmentAttempt.created_at.desc())
    )
    attempts = list(db.scalars(stmt))
    return [AttemptRead.model_validate(a) for a in attempts]
