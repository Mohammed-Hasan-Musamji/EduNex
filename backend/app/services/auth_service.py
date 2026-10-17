"""Registration and login business logic."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import create_session_token, hash_password, verify_password
from app.models.learner import Learner
from app.schemas.auth import LoginRequest, RegisterRequest


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def register(self, data: RegisterRequest) -> tuple[Learner, str]:
        existing = self.db.scalar(select(Learner).where(Learner.email == data.email.lower()))
        if existing is not None:
            raise ConflictError("An account with this email already exists")

        learner = Learner(
            display_name=data.display_name,
            email=data.email.lower(),
            hashed_password=hash_password(data.password),
            preferences={},
        )
        self.db.add(learner)
        self.db.commit()
        self.db.refresh(learner)
        token = create_session_token(learner.id)
        return learner, token

    def login(self, data: LoginRequest) -> tuple[Learner, str]:
        learner = self.db.scalar(select(Learner).where(Learner.email == data.email.lower()))
        # Always run verify_password, even when no account matches, so the
        # response time doesn't reveal whether the email exists.
        valid = verify_password(data.password, learner.hashed_password if learner else "$2b$12$" + "0" * 53)
        if learner is None or not valid:
            raise UnauthorizedError("Incorrect email or password")
        token = create_session_token(learner.id)
        return learner, token
