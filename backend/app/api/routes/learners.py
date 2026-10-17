"""Learner profile and preference endpoints.

Account creation happens at POST /api/v1/auth/register, not here. Every
route below requires the caller to be authenticated and to either be the
learner in question or an admin (see app/api/deps.py:verify_owner_or_admin).
"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_owner_or_admin
from app.models.learner import Learner
from app.schemas.learner import LearnerPreferences, LearnerRead, LearnerUpdate
from app.services.learner_service import LearnerService

router = APIRouter(prefix="/learners", tags=["learners"])


@router.get("/{learner_id}", response_model=LearnerRead)
def get_learner(
    learner_id: uuid.UUID, db: Session = Depends(get_db), _: Learner = Depends(verify_owner_or_admin)
) -> LearnerRead:
    learner = LearnerService(db).get(learner_id)
    return LearnerRead.model_validate(learner)


@router.patch("/{learner_id}", response_model=LearnerRead)
def update_learner(
    learner_id: uuid.UUID,
    payload: LearnerUpdate,
    db: Session = Depends(get_db),
    _: Learner = Depends(verify_owner_or_admin),
) -> LearnerRead:
    learner = LearnerService(db).update(learner_id, payload)
    return LearnerRead.model_validate(learner)


@router.get("/{learner_id}/preferences", response_model=LearnerPreferences)
def get_learner_preferences(
    learner_id: uuid.UUID, db: Session = Depends(get_db), _: Learner = Depends(verify_owner_or_admin)
) -> LearnerPreferences:
    return LearnerService(db).get_preferences(learner_id)


@router.put("/{learner_id}/preferences", response_model=LearnerPreferences)
def update_learner_preferences(
    learner_id: uuid.UUID,
    payload: LearnerPreferences,
    db: Session = Depends(get_db),
    _: Learner = Depends(verify_owner_or_admin),
) -> LearnerPreferences:
    return LearnerService(db).update_preferences(learner_id, payload)
