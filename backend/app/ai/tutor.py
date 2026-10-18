"""Grounded textbook question answering.

1. Embed the question (retrieval-query task type, same model/dimension as
   the stored chunks).
2. Retrieve chunks above RAG_MIN_SIMILARITY, optionally within a subject or
   a single document.
3. Nothing relevant -> answer `not_found` WITHOUT calling the model, so the
   app never presents a model guess as textbook content.
4. Otherwise ask Gemini to answer ONLY from the numbered excerpts, cite them
   inline as [S1], [S2]..., and self-report whether the excerpts support the
   answer fully, partially, or not at all.
5. Keep only citations that point at excerpts we actually supplied; renumber
   them [1], [2]... in the answer; attach database metadata for each.
   `none` support, or an answer with no valid citation, is reported as
   `grounded=false` and replaced with a plain "not in the textbooks" message.
6. Store the interaction (question, answer, cited chunk ids).
"""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient
from app.ai.personalization import personalization_for
from app.core.config import get_settings
from app.core.exceptions import NotFoundError, ServiceUnavailableError, ValidationAppError
from app.core.logging import get_logger
from app.models.academic_document import AcademicDocument
from app.models.learner import Learner
from app.models.learning_profile import TutorInteraction
from app.models.subject import Subject
from app.rag.embeddings import embed_query
from app.rag.retriever import RetrievedChunk, retrieve
from app.schemas.tutor import PersonalizationInfo, RetrievalInfo, TutorAnswer, TutorAskRequest, TutorSource

logger = get_logger(__name__)

EXCERPT_CHARS = 400
_LABEL = re.compile(r"\[S(\d+)\]")

_PROMPT = """You are EduNex's textbook tutor. Answer the student's question using ONLY the numbered
textbook excerpts below. Rules:
1. Every factual statement must come from the excerpts. Cite the excerpt(s) inline right after the
   statement as [S1], [S2], etc. Never cite a number that isn't listed.
2. If the excerpts only partly answer the question, answer that part and say plainly what they don't cover.
3. If the excerpts do not answer the question, set "support" to "none" and do not answer from general knowledge.
4. Do not invent page numbers, titles, authors, or URLs.
5. Presentation for this learner (style only -- never change the facts):
{style}
Respond with ONLY this JSON object:
{{"answer": string, "support": "full" | "partial" | "none", "cited": ["S1", ...]}}

STUDENT QUESTION:
{question}

TEXTBOOK EXCERPTS:
{excerpts}
"""

_UNVERIFIED_PROMPT = """You are EduNex's educational AI tutor. Answer the student's question clearly
and helpfully using your general knowledge. The textbook passages do not support this response, so do
not claim that it is supported by EduNex's textbooks. Do not invent textbook citations or sources.
Adapt the explanation to the learner's preferences when useful:
{style}

STUDENT QUESTION:
{question}

Respond with ONLY this JSON object:
{{"answer": string}}
"""


def _excerpt_block(index: int, chunk: RetrievedChunk) -> str:
    pages = ""
    if chunk.page_start is not None:
        pages = f", PDF p. {chunk.page_start}" + (f"-{chunk.page_end}" if chunk.page_end not in (None, chunk.page_start) else "")
    section = f" / {chunk.section_title}" if chunk.section_title else ""
    return f"[S{index}] ({chunk.document_title}{section}{pages})\n{chunk.chunk_text}"


class TutorService:
    def __init__(self, db: Session, gemini: GeminiClient) -> None:
        self.db = db
        self.gemini = gemini
        self.settings = get_settings()

    def _validate_filters(self, request: TutorAskRequest) -> None:
        if request.subject_id is not None:
            subject = self.db.get(Subject, request.subject_id)
            if subject is None or not subject.is_active:
                raise NotFoundError(f"Subject {request.subject_id} was not found")
        if request.document_id is not None:
            document = self.db.get(AcademicDocument, request.document_id)
            if document is None:
                raise NotFoundError(f"Document {request.document_id} was not found")
            if request.subject_id is not None and document.subject_id != request.subject_id:
                raise ValidationAppError("That document doesn't belong to the selected subject.")

    def ask(self, learner: Learner, request: TutorAskRequest) -> TutorAnswer:
        self._validate_filters(request)
        personalization = personalization_for((learner.preferences or {}).get("vark_preferences"))
        min_similarity = self.settings.rag_min_similarity

        # GeminiError (a ServiceUnavailableError) propagates as a 503 naming the
        # failure category; no vector is ever substituted.
        query_vector = embed_query(self.gemini, request.question)

        chunks = retrieve(
            self.db, query_vector,
            top_k=request.top_k or self.settings.rag_top_k, min_similarity=min_similarity,
            subject_id=request.subject_id, document_id=request.document_id,
        )
        retrieval = RetrievalInfo(
            retrieved=len(chunks),
            top_similarity=chunks[0].similarity_score if chunks else None,
            min_similarity=min_similarity,
            subject_id=request.subject_id,
            document_id=request.document_id,
        )

        answer, support, cited = "", "not_found", []
        if chunks:
            answer, support, cited = self._generate(request.question, chunks, personalization.instructions)
        if not chunks or support == "not_found":
            answer = self._generate_unverified(request.question, personalization.instructions)

        sources = self._sources(cited)
        grounded = support in ("supported", "partial") and bool(sources)
        interaction = TutorInteraction(
            learner_id=learner.id,
            question=request.question,
            answer=answer,
            grounded=grounded,
            subject_id=request.subject_id,
            document_id=request.document_id,
            cited_chunk_ids=[str(s.chunk_id) for s in sources],
            retrieval={**retrieval.model_dump(mode="json"), "model": self.gemini.last_model_used},
            created_at=datetime.now(UTC),
        )
        self.db.add(interaction)
        self.db.commit()

        return TutorAnswer(
            interaction_id=interaction.id,
            answer=answer,
            grounded=grounded,
            support=support if grounded else "not_found",  # type: ignore[arg-type]
            sources=sources,
            retrieval=retrieval,
            personalization=PersonalizationInfo(
                vark_preferences=personalization.preferences, explanation=personalization.explanation
            ),
            created_at=interaction.created_at,
        )

    def _generate(
        self, question: str, chunks: list[RetrievedChunk], style: list[str]
    ) -> tuple[str, str, list[RetrievedChunk]]:
        prompt = _PROMPT.format(
            style="\n".join(f"   - {s}" for s in style) or "   - Clear, balanced explanation.",
            question=question,
            excerpts="\n\n".join(_excerpt_block(i, c) for i, c in enumerate(chunks, start=1)),
        )
        raw = self.gemini.generate_json(prompt)
        try:
            data = json.loads(raw)
            answer = str(data["answer"]).strip()
            support = data.get("support")
            cited_labels = data.get("cited") or []
        except (ValueError, KeyError, TypeError):
            logger.warning("Tutor response was not valid JSON; reporting as unsupported.")
            return "", "not_found", []

        if support not in ("full", "partial") or not answer:
            return "", "not_found", []

        # Order sources by first appearance in the answer, then by the cited list.
        labels_in_order = [int(m) for m in _LABEL.findall(answer)]
        labels_in_order += [int(str(label).lstrip("Ss")) for label in cited_labels if str(label).lstrip("Ss").isdigit()]
        valid: list[int] = []
        for label in labels_in_order:
            if 1 <= label <= len(chunks) and label not in valid:
                valid.append(label)
        if not valid:
            return "", "not_found", []

        renumber = {label: i for i, label in enumerate(valid, start=1)}
        answer = _LABEL.sub(lambda m: f"[{renumber[int(m.group(1))]}]" if int(m.group(1)) in renumber else "", answer)
        answer = re.sub(r"[ \t]+([.,;:])", r"\1", re.sub(r"[ \t]{2,}", " ", answer)).strip()
        return answer, "supported" if support == "full" else "partial", [chunks[label - 1] for label in valid]

    def _generate_unverified(self, question: str, style: list[str]) -> str:
        prompt = _UNVERIFIED_PROMPT.format(
            style="\n".join(f"- {instruction}" for instruction in style) or "- Clear, balanced explanation.",
            question=question,
        )
        raw = self.gemini.generate_json(prompt)
        try:
            data = json.loads(raw)
            answer = data["answer"]
        except (ValueError, KeyError, TypeError) as exc:
            logger.warning("Gemini returned an invalid unverified tutor response.")
            raise ServiceUnavailableError("Gemini returned an invalid answer. Please try again.") from exc
        if not isinstance(answer, str) or not answer.strip():
            logger.warning("Gemini returned an empty unverified tutor response.")
            raise ServiceUnavailableError("Gemini returned an empty answer. Please try again.")
        return answer.strip()

    def _sources(self, cited: list[RetrievedChunk]) -> list[TutorSource]:
        sources = []
        for ref, chunk in enumerate(cited, start=1):
            document = self.db.get(AcademicDocument, chunk.document_id)
            meta = (document.doc_metadata if document else None) or {}
            subject = self.db.get(Subject, chunk.subject_id) if chunk.subject_id else None
            sources.append(
                TutorSource(
                    ref=ref,
                    chunk_id=chunk.chunk_id,
                    document_id=chunk.document_id,
                    title=chunk.document_title,
                    subject_id=chunk.subject_id,
                    subject=subject.name if subject else meta.get("subject"),
                    chapter=meta.get("chapter_title") or chunk.document_title,
                    section=chunk.section_title,
                    source_file=chunk.source_name,
                    page_start=chunk.page_start,
                    page_end=chunk.page_end,
                    similarity=chunk.similarity_score,
                    excerpt=chunk.chunk_text[:EXCERPT_CHARS],
                )
            )
        return sources
