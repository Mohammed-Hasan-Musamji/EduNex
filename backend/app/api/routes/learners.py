"""Learner profile and preference endpoints.

Development-stage limitation: these routes have no authentication. See
README.md "Known limitations".
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.learner import (
    LearnerCreate,
    LearnerPreferences,
    LearnerRead,
    LearnerUpdate,
)
from app.services.learner_service import LearnerService

router = APIRouter(prefix="/learners", tags=["learners"])


@router.post("", response_model=LearnerRead, status_code=status.HTTP_201_CREATED)
def create_learner(payload: LearnerCreate, db: Session = Depends(get_db)) -> LearnerRead:
    learner = LearnerService(db).create(payload)
    return LearnerRead.model_validate(learner)


@router.get("/{learner_id}", response_model=LearnerRead)
def get_learner(learner_id: uuid.UUID, db: Session = Depends(get_db)) -> LearnerRead:
    learner = LearnerService(db).get(learner_id)
    return LearnerRead.model_validate(learner)


@router.patch("/{learner_id}", response_model=LearnerRead)
def update_learner(learner_id: uuid.UUID, payload: LearnerUpdate, db: Session = Depends(get_db)) -> LearnerRead:
    learner = LearnerService(db).update(learner_id, payload)
    return LearnerRead.model_validate(learner)


@router.get("/{learner_id}/preferences", response_model=LearnerPreferences)
def get_learner_preferences(learner_id: uuid.UUID, db: Session = Depends(get_db)) -> LearnerPreferences:
    return LearnerService(db).get_preferences(learner_id)


@router.put("/{learner_id}/preferences", response_model=LearnerPreferences)
def update_learner_preferences(
    learner_id: uuid.UUID, payload: LearnerPreferences, db: Session = Depends(get_db)
) -> LearnerPreferences:
    return LearnerService(db).update_preferences(learner_id, payload)
