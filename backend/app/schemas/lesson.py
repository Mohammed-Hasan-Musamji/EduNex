"""Structured lesson schema.

Gemini is instructed to produce JSON matching this schema exactly (see
app/ai/prompts.py). The response is parsed and validated here before it is
ever stored or returned to the frontend -- invalid output is rejected, not
silently repaired or passed through. Nothing here allows arbitrary HTML,
CSS, or executable code to reach the frontend: every block is a narrow,
explicit structure the Next.js LessonRenderer already knows how to render.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.schemas.gamification import RewardSummary
from app.schemas.learner import VarkPreference


class SourceReference(BaseModel):
    """A source actually returned by retrieval -- never invented by the model."""

    chunk_id: uuid.UUID
    document_title: str
    excerpt: str = Field(max_length=600)


class ExplanationBlock(BaseModel):
    type: Literal["explanation"]
    heading: str = Field(min_length=1, max_length=160)
    body: str = Field(min_length=1, max_length=4000)


class KeyConceptBlock(BaseModel):
    type: Literal["key_concept"]
    title: str = Field(min_length=1, max_length=160)
    explanation: str = Field(min_length=1, max_length=2000)


class StepByStepExampleBlock(BaseModel):
    type: Literal["step_by_step_example"]
    title: str = Field(min_length=1, max_length=160)
    steps: list[str] = Field(min_length=1, max_length=20)


class DiagramNode(BaseModel):
    id: str = Field(min_length=1, max_length=60)
    label: str = Field(min_length=1, max_length=160)


class DiagramEdge(BaseModel):
    source: str
    target: str
    label: str | None = None


class DiagramBlock(BaseModel):
    type: Literal["diagram"]
    caption: str = Field(min_length=1, max_length=200)
    nodes: list[DiagramNode] = Field(min_length=1, max_length=50)
    edges: list[DiagramEdge] = Field(default_factory=list, max_length=100)


class LinkedListVisualizationConfig(BaseModel):
    """Validated configuration for the one frontend-supported visualization in this MVP."""

    node_values: list[str] = Field(min_length=1, max_length=20)
    mode: Literal["static", "traversal"] = "traversal"


class InteractiveVisualizationBlock(BaseModel):
    type: Literal["interactive_visualization"]
    # Only "linked_list" is implemented by the frontend today. Any other
    # value fails validation rather than silently rendering nothing.
    component_type: Literal["linked_list"]
    title: str = Field(min_length=1, max_length=160)
    config: LinkedListVisualizationConfig


class PracticeQuestionBlock(BaseModel):
    type: Literal["practice_question"]
    prompt: str = Field(min_length=1, max_length=500)
    options: list[str] = Field(min_length=2, max_length=6)
    correct_option_index: int = Field(ge=0)
    explanation: str = Field(min_length=1, max_length=1000)


class SummaryBlock(BaseModel):
    type: Literal["summary"]
    points: list[str] = Field(min_length=1, max_length=10)


class SourceReferencesBlock(BaseModel):
    type: Literal["source_references"]
    sources: list[SourceReference] = Field(default_factory=list)


LessonBlock = Annotated[
    ExplanationBlock
    | KeyConceptBlock
    | StepByStepExampleBlock
    | DiagramBlock
    | InteractiveVisualizationBlock
    | PracticeQuestionBlock
    | SummaryBlock
    | SourceReferencesBlock,
    Field(discriminator="type"),
]


class TopicRef(BaseModel):
    id: uuid.UUID
    name: str


class NextActivity(BaseModel):
    type: Literal["practice", "review", "lesson"]
    label: str
    topic_id: uuid.UUID | None = None


class Lesson(BaseModel):
    """The full structured lesson. This is what gets stored in
    LessonSession.lesson_json and returned to the frontend."""

    id: uuid.UUID
    topic: TopicRef
    title: str = Field(min_length=1, max_length=200)
    learning_objectives: list[str] = Field(min_length=1, max_length=10)
    blocks: list[LessonBlock] = Field(min_length=1, max_length=20)
    source_references: list[SourceReference] = Field(default_factory=list)
    next_activity: NextActivity | None = None


# --- Lesson session (API request/response) schemas ---


class LessonSessionCreate(BaseModel):
    """learner_id is intentionally absent -- the route derives it from the
    authenticated session, never from client input."""

    topic_id: uuid.UUID
    prompt: str = Field(min_length=1, max_length=1000)
    vark_preferences: list[VarkPreference] = Field(default_factory=list)


class LessonSessionRead(BaseModel):
    id: uuid.UUID
    learner_id: uuid.UUID
    topic_id: uuid.UUID
    prompt: str
    vark_preferences: list[VarkPreference]
    status: Literal["generating", "ready", "failed"]
    lesson: Lesson | None
    source_references: list[SourceReference]
    failure_reason: str | None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class LessonSessionSummary(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    topic_name: str
    status: Literal["generating", "ready", "failed"]
    prompt: str
    lesson_title: str | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class LessonCompletionResult(BaseModel):
    lesson_session_id: uuid.UUID
    completed_at: datetime
    already_completed: bool
    rewards: RewardSummary | None

