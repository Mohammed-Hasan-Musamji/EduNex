"""Admin: generate grounded questions from textbook chunks, and review them.

Questions generated through the admin endpoint start `unreviewed` and stay
hidden from learners until an admin approves them. Learner-triggered practice
and diagnostic generation uses the same grounded validator and stores
auto-approved items with their source passage.
"""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient, get_gemini_client
from app.api.deps import get_db, require_admin
from app.core.exceptions import NotFoundError
from app.models.assessment import AssessmentQuestion
from app.schemas.assessment import QuestionPublic
from app.services.question_generation import generate_for_topic

router = APIRouter(prefix="/admin", tags=["admin-questions"], dependencies=[Depends(require_admin)])


class GenerateRequest(BaseModel):
    excerpts: int = Field(default=4, ge=1, le=10)
    per_excerpt: int = Field(default=2, ge=1, le=5)


class GenerateResult(BaseModel):
    topic_id: uuid.UUID
    excerpts_used: int
    accepted: int
    rejected_invalid: int
    rejected_duplicate: int


class AdminQuestion(QuestionPublic):
    correct_answer: int | bool
    explanation: str
    source_chunk_id: uuid.UUID | None


class ReviewUpdate(BaseModel):
    review_status: Literal["approved", "rejected", "unreviewed"]


@router.post("/topics/{topic_id}/questions/generate", response_model=GenerateResult)
def generate_questions(
    topic_id: uuid.UUID,
    payload: GenerateRequest,
    db: Session = Depends(get_db),
    gemini: GeminiClient = Depends(get_gemini_client),
) -> GenerateResult:
    report = generate_for_topic(db, gemini, topic_id, excerpts=payload.excerpts, per_excerpt=payload.per_excerpt)
    return GenerateResult(**{k: getattr(report, k) for k in GenerateResult.model_fields})


@router.get("/questions", response_model=list[AdminQuestion])
def list_questions(
    review_status: Literal["approved", "rejected", "unreviewed"] | None = None,
    topic_id: uuid.UUID | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[AdminQuestion]:
    stmt = select(AssessmentQuestion).order_by(AssessmentQuestion.created_at.desc()).limit(limit)
    if review_status:
        stmt = stmt.where(AssessmentQuestion.review_status == review_status)
    if topic_id:
        stmt = stmt.where(AssessmentQuestion.topic_id == topic_id)
    return [AdminQuestion.model_validate(q, from_attributes=True) for q in db.scalars(stmt)]


@router.patch("/questions/{question_id}/review", response_model=AdminQuestion)
def review_question(question_id: uuid.UUID, payload: ReviewUpdate, db: Session = Depends(get_db)) -> AdminQuestion:
    question = db.get(AssessmentQuestion, question_id)
    if question is None:
        raise NotFoundError(f"Question {question_id} was not found")
    question.review_status = payload.review_status
    db.commit()
    db.refresh(question)
    return AdminQuestion.model_validate(question, from_attributes=True)
