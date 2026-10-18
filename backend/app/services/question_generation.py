"""Grounded assessment-question generation from indexed textbook chunks.

For a topic (a chapter-level document, see app/rag/catalog.py), excerpts
are sampled evenly across the chapter. Gemini drafts questions from ONE
excerpt at a time, and each draft is accepted only if it:
- parses into the strict schema below (MCQ: 4 distinct options and an
  in-range answer index; true/false: a boolean answer);
- has an explanation (shown after answering);
- isn't a near-duplicate of an existing question in that topic.
Accepted items are stored with origin="generated",
source_chunk_id pointing at the excerpt they were written from -- so every
generated item traces back to a specific textbook passage and page. Admin
generation defaults to `unreviewed`; learner-triggered generation may pass
`approved` after the same strict schema and source validation. Nothing is
generated without a source passage; if Gemini is unavailable, nothing is stored.
"""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass, field
from typing import Literal

from pydantic import BaseModel, Field, ValidationError, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient
from app.core.exceptions import NotFoundError, ValidationAppError
from app.models.academic_document import AcademicDocument, IngestionStatus
from app.models.assessment import AssessmentQuestion, QuestionType
from app.models.content_chunk import AcademicContentChunk
from app.models.topic import DifficultyLevel, Topic

MAX_PER_TOPIC = 20
MIN_EXCERPT_CHARS = 300


class DraftQuestion(BaseModel):
    question_text: str = Field(min_length=10, max_length=500)
    question_type: Literal["multiple_choice", "true_false"]
    options: list[str] | None = None
    correct_answer: int | bool
    explanation: str = Field(min_length=10, max_length=1000)
    difficulty: Literal["beginner", "intermediate", "advanced"]

    @model_validator(mode="after")
    def _check_shape(self) -> DraftQuestion:
        if self.question_type == "multiple_choice":
            if not self.options or len(self.options) != 4:
                raise ValueError("multiple_choice needs exactly 4 options")
            if len({o.strip().lower() for o in self.options}) != 4 or any(not o.strip() for o in self.options):
                raise ValueError("options must be distinct and non-empty")
            if isinstance(self.correct_answer, bool) or not 0 <= self.correct_answer < 4:
                raise ValueError("correct_answer must be an option index 0-3")
        else:
            if not isinstance(self.correct_answer, bool):
                raise ValueError("true_false correct_answer must be a boolean")
            self.options = None
        return self


MAX_DRAFTS_PER_EXCERPT = 5


@dataclass
class GenerationReport:
    topic_id: uuid.UUID
    excerpts_used: int = 0
    accepted: int = 0
    rejected_invalid: int = 0
    rejected_duplicate: int = 0
    errors: list[str] = field(default_factory=list)


_PROMPT = """Write {count} assessment questions that test UNDERSTANDING of the textbook excerpt below.
Rules:
- Every question must be answerable from this excerpt alone; do not use outside facts.
- Prefer conceptual questions over trivia (no "which page" or "what is the chapter title").
- multiple_choice: exactly 4 distinct options, plausible distractors, correct_answer is the 0-based index.
- true_false: correct_answer is true or false.
- explanation: why the answer is correct, grounded in the excerpt.
- difficulty: beginner (recall/definition), intermediate (apply/compare), advanced (analyze/multi-step).
Return ONLY JSON: {{"questions": [{{"question_text": str, "question_type": "multiple_choice"|"true_false",
"options": [str, str, str, str] | null, "correct_answer": int | bool, "explanation": str,
"difficulty": "beginner"|"intermediate"|"advanced"}}]}}

SUBJECT: {subject}
CHAPTER: {chapter}
EXCERPT (PDF page {pages}):
{excerpt}
"""


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()


def _is_duplicate(candidate: str, existing: list[str]) -> bool:
    words = set(_normalize(candidate).split())
    for other in existing:
        other_words = set(_normalize(other).split())
        if not words or not other_words:
            continue
        if len(words & other_words) / len(words | other_words) >= 0.8:
            return True
    return False


def sample_chunks(chunks: list[AcademicContentChunk], count: int) -> list[AcademicContentChunk]:
    usable = [c for c in chunks if len(c.chunk_text) >= MIN_EXCERPT_CHARS]
    if len(usable) <= count:
        return usable
    step = len(usable) / count
    return [usable[int(i * step)] for i in range(count)]


def generate_for_topic(
    db: Session,
    client: GeminiClient,
    topic_id: uuid.UUID,
    *,
    excerpts: int = 4,
    per_excerpt: int = 2,
    review_status: Literal["approved", "unreviewed"] = "unreviewed",
) -> GenerationReport:
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise NotFoundError(f"Topic {topic_id} was not found")
    documents = list(
        db.scalars(
            select(AcademicDocument).where(
                AcademicDocument.topic_id == topic.id, AcademicDocument.ingestion_status == IngestionStatus.indexed
            )
        )
    )
    if not documents:
        raise ValidationAppError(f"'{topic.name}' has no indexed textbook content to generate questions from.")

    existing = list(
        db.scalars(
            select(AssessmentQuestion).where(
                AssessmentQuestion.topic_id == topic.id,
                AssessmentQuestion.origin != "seeded",
            )
        )
    )
    if len(existing) >= MAX_PER_TOPIC:
        raise ValidationAppError(f"'{topic.name}' already has {len(existing)} questions (limit {MAX_PER_TOPIC}).")
    existing_texts = [q.question_text for q in existing]
    report = GenerationReport(topic_id=topic.id)

    chunks = list(
        db.scalars(
            select(AcademicContentChunk)
            .where(AcademicContentChunk.document_id.in_([d.id for d in documents]))
            .order_by(AcademicContentChunk.document_id, AcademicContentChunk.chunk_order)
        )
    )
    for chunk in sample_chunks(chunks, excerpts):
        if len(existing_texts) >= MAX_PER_TOPIC:
            break
        report.excerpts_used += 1
        meta = chunk.chunk_metadata or {}
        pages = f"{chunk.page_start}" + (f"-{chunk.page_end}" if chunk.page_end not in (None, chunk.page_start) else "")
        prompt = _PROMPT.format(
            count=per_excerpt,
            subject=meta.get("subject") or "",
            chapter=meta.get("chapter_title") or topic.name,
            pages=pages if chunk.page_start else "unknown",
            excerpt=chunk.chunk_text,
        )
        raw = client.generate_json(prompt)  # GeminiError propagates: nothing is stored without the model
        try:
            items = json.loads(raw).get("questions")
            if not isinstance(items, list):
                raise ValueError("no questions list")
        except (ValueError, AttributeError) as exc:
            report.rejected_invalid += 1
            report.errors.append(f"excerpt {chunk.id}: {type(exc).__name__}")
            continue
        for item in items[:MAX_DRAFTS_PER_EXCERPT]:
            try:
                draft = DraftQuestion.model_validate(item)
            except ValidationError:
                report.rejected_invalid += 1
                continue
            if _is_duplicate(draft.question_text, existing_texts):
                report.rejected_duplicate += 1
                continue
            db.add(
                AssessmentQuestion(
                    topic_id=topic.id,
                    question_text=draft.question_text.strip(),
                    question_type=QuestionType(draft.question_type),
                    options=[o.strip() for o in draft.options] if draft.options else None,
                    correct_answer=draft.correct_answer,
                    explanation=draft.explanation.strip(),
                    difficulty=DifficultyLevel(draft.difficulty),
                    origin="generated",
                    review_status=review_status,
                    source_chunk_id=chunk.id,
                )
            )
            existing_texts.append(draft.question_text)
            report.accepted += 1
    db.commit()
    return report
