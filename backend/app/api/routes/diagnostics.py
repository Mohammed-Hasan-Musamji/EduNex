"""Adaptive skills-diagnostic endpoints (see app/services/diagnostic_service.py).

The learner is always the authenticated caller. Answers are accepted only
for the question the server is currently serving in that diagnostic.
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient, get_gemini_client
from app.api.deps import get_current_learner, get_db, verify_owner_or_admin
from app.core.rate_limit import SlidingWindowLimiter
from app.models.learner import Learner
from app.schemas.diagnostic import DiagnosticAnswer, DiagnosticAnswerResult, DiagnosticListItem, DiagnosticStart, DiagnosticState
from app.services.diagnostic_service import DiagnosticService

router = APIRouter(tags=["diagnostics"])
diagnostic_generation_limiter = SlidingWindowLimiter(limit=5, window_seconds=60)


@router.post("/diagnostics", response_model=DiagnosticState, status_code=status.HTTP_201_CREATED)
def start_diagnostic(
    payload: DiagnosticStart,
    db: Session = Depends(get_db),
    current: Learner = Depends(get_current_learner),
    gemini: GeminiClient = Depends(get_gemini_client),
) -> DiagnosticState:
    """Starts a diagnostic for a subject -- or returns the learner's
    in-progress one for that subject, so leaving and coming back resumes it."""
    service = DiagnosticService(db)
    diagnostic_generation_limiter.check(str(current.id))
    service.generate_questions_if_empty(current, payload.subject_id, gemini)
    return service.start(current, payload.subject_id)


@router.get("/diagnostics/{diagnostic_id}", response_model=DiagnosticState)
def get_diagnostic(
    diagnostic_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: Learner = Depends(get_current_learner),
    gemini: GeminiClient = Depends(get_gemini_client),
) -> DiagnosticState:
    service = DiagnosticService(db)
    round_ = service.get_owned(diagnostic_id, current)
    if round_.status.value == "in_progress" and round_.learner_id == current.id and round_.subject_id:
        service.generate_questions_if_empty(current, round_.subject_id, gemini)
        return service.start(current, round_.subject_id)
    return service.state(round_)


@router.post("/diagnostics/{diagnostic_id}/answers", response_model=DiagnosticAnswerResult)
def answer_diagnostic(
    diagnostic_id: uuid.UUID,
    payload: DiagnosticAnswer,
    db: Session = Depends(get_db),
    current: Learner = Depends(get_current_learner),
) -> DiagnosticAnswerResult:
    return DiagnosticService(db).answer(current, diagnostic_id, payload)


@router.get("/learners/{learner_id}/diagnostics", response_model=list[DiagnosticListItem])
def list_diagnostics(
    learner_id: uuid.UUID, db: Session = Depends(get_db), _: Learner = Depends(verify_owner_or_admin)
) -> list[DiagnosticListItem]:
    return DiagnosticService(db).list_for_learner(learner_id)
