"""Learner profile and preference schemas.

Important limitation: this MVP has no authentication system. `learner_id`
is a development-stage identifier, not proof of identity -- any client that
knows (or guesses) a learner_id can act as that learner. See README.md.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class VarkPreference(str, enum.Enum):
    """Optional, changeable learning-style preference -- not a scientific diagnosis."""

    visual = "visual"
    auditory = "auditory"
    read_write = "read_write"
    kinesthetic = "kinesthetic"


class LearnerPreferences(BaseModel):
    vark_preferences: list[VarkPreference] = Field(default_factory=list)
    preferred_detail: str | None = Field(default=None, max_length=50)
    learning_goal: str | None = Field(default=None, max_length=500)


class LearnerCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    preferences: LearnerPreferences = Field(default_factory=LearnerPreferences)


class LearnerUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    preferences: LearnerPreferences | None = None


class LearnerRead(ORMModel):
    id: uuid.UUID
    display_name: str
    preferences: LearnerPreferences
    created_at: datetime
    updated_at: datetime
