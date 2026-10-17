"""Password hashing and session-token helpers.

Passwords are hashed with bcrypt (never stored in plaintext, never logged).
Sessions are signed JWTs carried in an httpOnly cookie -- never readable by
frontend JavaScript, so they can't be exfiltrated via XSS the way a
localStorage token could be.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from jwt import InvalidTokenError

from app.core.config import get_settings

JWT_ALGORITHM = "HS256"


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        # Malformed hash (shouldn't happen for rows we created ourselves).
        return False


def create_session_token(learner_id: uuid.UUID) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(learner_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str) -> uuid.UUID | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[JWT_ALGORITHM])
    except InvalidTokenError:
        return None
    subject = payload.get("sub")
    if not subject:
        return None
    try:
        return uuid.UUID(subject)
    except ValueError:
        return None
