"""Textbook question answering (see app/ai/tutor.py for the grounding rules)."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient, get_gemini_client
from app.ai.tutor import TutorService
from app.api.deps import get_current_learner, get_db, verify_owner_or_admin
from app.core.rate_limit import SlidingWindowLimiter
from app.models.learner import Learner
from app.models.learning_profile import TutorInteraction
from app.schemas.tutor import TutorAnswer, TutorAskRequest, TutorHistoryItem

router = APIRouter(tags=["tutor"])

# 20 questions per learner per minute: each one costs an embedding + a generation call.
ask_limiter = SlidingWindowLimiter(limit=20, window_seconds=60)


@router.post("/tutor/ask", response_model=TutorAnswer)
def ask_tutor(
    payload: TutorAskRequest,
    db: Session = Depends(get_db),
    current: Learner = Depends(get_current_learner),
    gemini: GeminiClient = Depends(get_gemini_client),
) -> TutorAnswer:
    """Answers from retrieved textbook excerpts only, with verified citations.
    `grounded=false` means the indexed textbooks don't support an answer."""
    ask_limiter.check(str(current.id))
    return TutorService(db, gemini).ask(current, payload)


@router.get("/learners/{learner_id}/tutor/history", response_model=list[TutorHistoryItem])
def tutor_history(
    learner_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Learner = Depends(verify_owner_or_admin),
) -> list[TutorHistoryItem]:
    rows = db.scalars(
        select(TutorInteraction)
        .where(TutorInteraction.learner_id == learner_id)
        .order_by(TutorInteraction.created_at.desc())
        .limit(limit)
    )
    return [
        TutorHistoryItem(
            id=r.id, question=r.question, answer=r.answer, grounded=r.grounded,
            subject_id=r.subject_id, cited_chunk_ids=r.cited_chunk_ids, created_at=r.created_at,
        )
        for r in rows
    ]
