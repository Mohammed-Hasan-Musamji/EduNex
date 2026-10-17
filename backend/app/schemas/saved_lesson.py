"""Saved lesson schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class SavedLessonRead(BaseModel):
    id: uuid.UUID
    learner_id: uuid.UUID
    lesson_session_id: uuid.UUID
    topic_name: str
    lesson_title: str | None
    saved_at: datetime
