import secrets
import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_owner_or_admin
from app.api.routes.auth import set_session_cookie
from app.core.security import create_session_token
from app.models.learner import Learner
from app.schemas.auth import RegisterRequest
from app.schemas.learner import (
    LearnerCreate,
    LearnerPreferences,
    LearnerRead,
    LearnerUpdate,
)
from app.services.auth_service import AuthService
from app.services.learner_service import LearnerService

router = APIRouter(prefix="/learners", tags=["learners"])


@router.post("", response_model=LearnerRead, status_code=status.HTTP_201_CREATED)
def create_learner(
    payload: LearnerCreate,
    response: Response,
    db: Session = Depends(get_db),
) -> LearnerRead:
    email = payload.email.lower() if payload.email else f"learner-{uuid.uuid4().hex[:12]}@example.com"
    password = payload.password or secrets.token_urlsafe(16)
    learner, token = AuthService(db).register(
        RegisterRequest(
            display_name=payload.display_name,
            email=email,
            password=password,
        )
    )
    set_session_cookie(response, token)
    return LearnerRead.model_validate(learner)


@router.post("/{learner_id}/resume", response_model=LearnerRead)
def resume_learner(
    learner_id: uuid.UUID,
    response: Response,
    db: Session = Depends(get_db),
) -> LearnerRead:
    learner = LearnerService(db).get(learner_id)
    token = create_session_token(learner.id)
    set_session_cookie(response, token)
    return LearnerRead.model_validate(learner)


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
