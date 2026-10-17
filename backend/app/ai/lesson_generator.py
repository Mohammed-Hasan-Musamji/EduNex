"""Grounded, schema-validated lesson generation.

Orchestrates: embed the learner's request -> retrieve relevant academic
chunks -> build a grounded prompt -> call Gemini -> parse and strictly
validate the JSON response -> return a Lesson plus the source references
that were *actually retrieved* (never whatever citations the model claims).
"""

from __future__ import annotations

import json
import uuid

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.ai.gemini_client import GeminiClient
from app.ai.prompts import build_lesson_prompt
from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError
from app.core.logging import get_logger
from app.models.topic import Topic
from app.rag.embeddings import embed_chunks
from app.rag.retriever import RetrievedChunk, retrieve
from app.schemas.lesson import Lesson, SourceReference

logger = get_logger(__name__)

MAX_GENERATION_ATTEMPTS = 2
EXCERPT_LENGTH = 300


class LessonGenerator:
    def __init__(self, gemini_client: GeminiClient) -> None:
        self.gemini_client = gemini_client

    def generate(
        self,
        db: Session,
        *,
        topic: Topic,
        learner_prompt: str,
        vark_preferences: list[str],
    ) -> tuple[Lesson, list[SourceReference]]:
        if not self.gemini_client.is_configured:
            raise ServiceUnavailableError(
                "Lesson generation is unavailable: GEMINI_API_KEY is not configured on this server."
            )

        retrieved = self._retrieve_context(db, topic=topic, learner_prompt=learner_prompt)
        prompt = build_lesson_prompt(
            topic_name=topic.name,
            topic_description=topic.description,
            learner_prompt=learner_prompt,
            vark_preferences=vark_preferences,
            retrieved_chunks=retrieved,
        )

        source_references = [
            SourceReference(
                chunk_id=chunk.chunk_id,
                document_title=chunk.document_title,
                excerpt=chunk.chunk_text[:EXCERPT_LENGTH],
            )
            for chunk in retrieved
        ]

        last_error: Exception | None = None
        for attempt in range(1, MAX_GENERATION_ATTEMPTS + 1):
            raw_text = self.gemini_client.generate_json(prompt)
            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError as exc:
                last_error = exc
                logger.warning("Gemini returned invalid JSON on attempt %d", attempt)
                continue

            # The model never controls its own id, topic identity, or which
            # sources are "real" -- those are server-authoritative.
            data["id"] = str(uuid.uuid4())
            data["topic"] = {"id": str(topic.id), "name": topic.name}
            data["source_references"] = [ref.model_dump(mode="json") for ref in source_references]
            for block in data.get("blocks", []):
                if isinstance(block, dict) and block.get("type") == "source_references":
                    block["sources"] = [ref.model_dump(mode="json") for ref in source_references]

            try:
                lesson = Lesson.model_validate(data)
            except ValidationError as exc:
                last_error = exc
                logger.warning("Gemini lesson failed schema validation on attempt %d", attempt)
                continue

            return lesson, source_references

        raise ServiceUnavailableError(
            f"Gemini did not return a schema-valid lesson after {MAX_GENERATION_ATTEMPTS} attempts: {last_error}"
        )

    def _retrieve_context(self, db: Session, *, topic: Topic, learner_prompt: str) -> list[RetrievedChunk]:
        settings = get_settings()
        query_text = f"{topic.name}: {learner_prompt}"
        try:
            query_embedding = embed_chunks(self.gemini_client, [query_text])[0]
        except ServiceUnavailableError:
            logger.warning("Embedding the learner prompt failed; generating without retrieved context.")
            return []
        return retrieve(db, query_embedding, top_k=settings.rag_top_k, min_similarity=settings.rag_min_similarity)
