"""Admin user-management schemas. Real accounts, not fabricated rows."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.learner import LearnerRole
from app.schemas.common import ORMModel


class AdminUserRead(ORMModel):
    id: uuid.UUID
    display_name: str
    email: str
    role: LearnerRole
    created_at: datetime


class AdminUserRoleUpdate(BaseModel):
    role: LearnerRole
