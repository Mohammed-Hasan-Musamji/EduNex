"""Learner progress and recommendation schemas.

The recommendation algorithm is a simple, explainable heuristic (see
app/services/recommendation_service.py) -- not a validated mastery model.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ProgressRead(BaseModel):
    learner_id: uuid.UUID
    topic_id: uuid.UUID
    topic_name: str
    mastery_estimate: float
    attempts_count: int
    correct_count: int
    last_activity_at: datetime | None
    updated_at: datetime


class Recommendation(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    recommendation_type: Literal["beginner_practice", "review", "practice_harder", "continue"]
    label: str
    rationale: str
