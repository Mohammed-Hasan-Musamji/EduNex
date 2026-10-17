"""Learner profile and preference business logic.

Ownership enforcement (a caller may only read/modify their own profile,
unless they are an admin) happens in the route layer via
app/api/deps.py:verify_owner_or_admin -- not here.
"""

import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.learner import Learner
from app.schemas.learner import LearnerPreferences, LearnerUpdate


class LearnerService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, learner_id: uuid.UUID) -> Learner:
        learner = self.db.get(Learner, learner_id)
        if learner is None:
            raise NotFoundError(f"Learner {learner_id} was not found")
        return learner

    def update(self, learner_id: uuid.UUID, data: LearnerUpdate) -> Learner:
        learner = self.get(learner_id)
        if data.display_name is not None:
            learner.display_name = data.display_name
        if data.preferences is not None:
            learner.preferences = data.preferences.model_dump(mode="json")
        self.db.commit()
        self.db.refresh(learner)
        return learner

    def get_preferences(self, learner_id: uuid.UUID) -> LearnerPreferences:
        learner = self.get(learner_id)
        return LearnerPreferences.model_validate(learner.preferences)

    def update_preferences(self, learner_id: uuid.UUID, preferences: LearnerPreferences) -> LearnerPreferences:
        learner = self.get(learner_id)
        learner.preferences = preferences.model_dump(mode="json")
        self.db.commit()
        return preferences
