"""Registration, login, logout, and current-user endpoints.

Sessions are a signed JWT in an httpOnly cookie -- never exposed to
frontend JavaScript, never placed in a response body or localStorage.
"""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_learner, get_db
from app.core.config import get_settings
from app.models.learner import Learner
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.learner import LearnerRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


_set_session_cookie = set_session_cookie



@router.post("/register", response_model=LearnerRead, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> LearnerRead:
    learner, token = AuthService(db).register(payload)
    _set_session_cookie(response, token)
    return LearnerRead.model_validate(learner)


@router.post("/login", response_model=LearnerRead)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> LearnerRead:
    learner, token = AuthService(db).login(payload)
    _set_session_cookie(response, token)
    return LearnerRead.model_validate(learner)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(key=settings.session_cookie_name, path="/")


@router.get("/me", response_model=LearnerRead)
def me(current: Learner = Depends(get_current_learner)) -> LearnerRead:
    return LearnerRead.model_validate(current)
