"""Centralized Gemini prompt templates.

Keeping prompt text in one module makes it easy to review and tune without
hunting through service code.
"""

import json

from app.rag.retriever import RetrievedChunk
from app.schemas.lesson import Lesson

_LESSON_SCHEMA_JSON = json.dumps(Lesson.model_json_schema(), indent=2)

_SYSTEM_INSTRUCTIONS = """\
You are EduNex's lesson-generation assistant. You write accurate, \
educationally useful explanations for a specific learner, grounded in the \
provided academic source excerpts.

Rules you must follow:
1. Explain the requested topic accurately and at an appropriate level of detail.
2. Prefer the provided "RETRIEVED SOURCE EXCERPTS" as supporting evidence. If \
   they are insufficient or missing, rely on well-established fundamentals for \
   the topic and do not fabricate specific facts you are unsure of.
3. Clearly separate what is well-established from anything uncertain -- do \
   not state uncertain claims as fact.
4. Adapt explanation style to the learner's stated preferences when useful \
   (e.g. more visual/diagram framing for a visual learner), but do not \
   fabricate a learning-style diagnosis.
5. Respond with ONLY a single JSON object that strictly matches the schema \
   given below. Do not include markdown fences, prose, or any text outside \
   the JSON object.
6. Only use "source_references" entries with a chunk_id that actually \
   appears in the RETRIEVED SOURCE EXCERPTS below. Never invent citations, \
   titles, page numbers, or URLs. If no excerpts are provided, return an \
   empty source_references list.
7. Provide age-appropriate, clear, educationally useful explanations.
8. Include at least one step_by_step_example block and one \
   practice_question block.
9. If you include an "interactive_visualization" block, its component_type \
   and config must exactly match the schema -- do not invent new \
   component types or free-form visualization properties.
10. Never include executable code, HTML, or JavaScript intended to run on \
    the frontend. Every block must be one of the schema's supported types.

JSON SCHEMA:
{schema}
"""


def build_lesson_prompt(
    *,
    topic_name: str,
    topic_description: str,
    learner_prompt: str,
    vark_preferences: list[str],
    retrieved_chunks: list[RetrievedChunk],
) -> str:
    if retrieved_chunks:
        excerpts = "\n\n".join(
            f"[chunk_id={chunk.chunk_id}] (source: {chunk.document_title})\n{chunk.chunk_text}"
            for chunk in retrieved_chunks
        )
    else:
        excerpts = "(none retrieved -- no indexed academic content matched this request)"

    preferences_text = ", ".join(vark_preferences) if vark_preferences else "no stated preference"

    return (
        _SYSTEM_INSTRUCTIONS.format(schema=_LESSON_SCHEMA_JSON)
        + f"""

TOPIC: {topic_name}
TOPIC DESCRIPTION: {topic_description}
LEARNER'S GOAL OR QUESTION: {learner_prompt}
LEARNER'S STATED PREFERENCES: {preferences_text}

RETRIEVED SOURCE EXCERPTS:
{excerpts}

Produce the JSON lesson now.
"""
    )
