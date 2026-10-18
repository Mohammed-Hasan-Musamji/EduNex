"""Learner profile and preference business logic.

Ownership enforcement (a caller may only read/modify their own profile,
unless they are an admin) happens in the route layer via
app/api/deps.py:verify_owner_or_admin -- not here.
"""

import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.learner import Learner, OnboardingStatus
from app.schemas.learner import LearnerPreferences, LearnerUpdate


class LearnerService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, learner_id: uuid.UUID) -> Learner:
        learner = self.db.get(Learner, learner_id)
        if learner is None:
            raise NotFoundError(f"Learner {learner_id} was not found")
        return learner

    @staticmethod
    def _merge_preferences(stored: dict, incoming: LearnerPreferences) -> dict:
        """Client-sent provenance is ignored: questionnaire scores are kept, and a
        manual change to the VARK selection marks it self-selected."""
        merged = incoming.model_dump(mode="json", exclude={"vark_source", "vark_scores", "vark_assessed_at"})
        for key in ("vark_source", "vark_scores", "vark_assessed_at"):
            if stored.get(key) is not None:
                merged[key] = stored[key]
        if sorted(merged["vark_preferences"]) != sorted(stored.get("vark_preferences") or []):
            merged["vark_source"] = "self_selected" if merged["vark_preferences"] else None
        return merged

    def update(self, learner_id: uuid.UUID, data: LearnerUpdate) -> Learner:
        learner = self.get(learner_id)
        if data.display_name is not None:
            learner.display_name = data.display_name
        if data.preferences is not None:
            learner.preferences = self._merge_preferences(learner.preferences or {}, data.preferences)
        self.db.commit()
        self.db.refresh(learner)
        return learner

    def get_preferences(self, learner_id: uuid.UUID) -> LearnerPreferences:
        learner = self.get(learner_id)
        return LearnerPreferences.model_validate(learner.preferences)

    def update_preferences(self, learner_id: uuid.UUID, preferences: LearnerPreferences) -> LearnerPreferences:
        learner = self.get(learner_id)
        learner.preferences = self._merge_preferences(learner.preferences or {}, preferences)
        self.db.commit()
        return LearnerPreferences.model_validate(learner.preferences)

    def update_onboarding(self, learner_id: uuid.UUID, status: str) -> Learner:
        learner = self.get(learner_id)
        # A finished onboarding stays finished; deferring it later is a no-op.
        if learner.onboarding_status != OnboardingStatus.completed:
            learner.onboarding_status = OnboardingStatus(status)
            self.db.commit()
            self.db.refresh(learner)
        return learner

