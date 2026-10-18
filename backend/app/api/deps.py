"""Shared FastAPI dependencies: database sessions and authentication/authorization.

`get_current_learner` is the single source of truth for "who is making this
request" -- it reads the signed session cookie, never a client-supplied
learner_id. Route handlers that accept a `learner_id` path parameter must
still use `verify_owner_or_admin` to check it matches the authenticated
caller (or that the caller is an admin) before trusting it for anything.
"""

import uuid
from collections.abc import Generator

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_session_token
from app.db.session import get_db as _get_db
from app.models.learner import Learner, LearnerRole

DbSession = Session


def get_db() -> Generator[Session, None, None]:
    yield from _get_db()


def get_current_learner(request: Request, db: Session = Depends(get_db)) -> Learner:
    settings = get_settings()
    token = request.cookies.get(settings.session_cookie_name)
    learner_id = decode_session_token(token) if token else None
    if learner_id is None:
        raise UnauthorizedError("Please sign in to continue.")

    learner = db.get(Learner, learner_id)
    if learner is None:
        raise UnauthorizedError("Please sign in to continue.")
    return learner


def get_optional_learner(request: Request, db: Session = Depends(get_db)) -> Learner | None:
    """The signed-in learner if there is a valid session, else None (for public routes that personalize)."""
    token = request.cookies.get(get_settings().session_cookie_name)
    learner_id = decode_session_token(token) if token else None
    return db.get(Learner, learner_id) if learner_id else None


def require_admin(current: Learner = Depends(get_current_learner)) -> Learner:
    if current.role != LearnerRole.admin:
        raise ForbiddenError("You do not have permission to do that.")
    return current


def verify_owner_or_admin(learner_id: uuid.UUID, current: Learner = Depends(get_current_learner)) -> Learner:
    """Use as a dependency on any route with a `learner_id` path parameter
    that represents learner-owned data -- confirms the authenticated caller
    either IS that learner or is an admin, rather than trusting the path
    value on its own."""
    if current.id != learner_id and current.role != LearnerRole.admin:
        raise ForbiddenError("You do not have permission to access this learner's data.")
    return current
