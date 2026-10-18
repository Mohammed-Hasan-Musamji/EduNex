"""Learner profile and preference schemas.

Accounts are created via POST /api/v1/auth/register (see app/schemas/auth.py)
-- not here. `LearnerRead` is also used as the authenticated-user response
shape for GET /api/v1/auth/me.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.learner import LearnerRole, OnboardingStatus
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
    # Provenance of vark_preferences -- set by the server, ignored on input.
    vark_source: Literal["self_selected", "questionnaire"] | None = None
    vark_scores: dict[str, int] | None = None
    vark_assessed_at: datetime | None = None


class LearnerUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    preferences: LearnerPreferences | None = None


class LearnerRead(ORMModel):
    id: uuid.UUID
    display_name: str
    email: str
    role: LearnerRole
    onboarding_status: OnboardingStatus
    preferences: LearnerPreferences
    created_at: datetime
    updated_at: datetime


class OnboardingUpdate(BaseModel):
    """A learner may start or defer onboarding. `completed` is set only by
    the server when a diagnostic finishes, so it is not accepted here."""

    status: Literal["in_progress", "skipped"]

