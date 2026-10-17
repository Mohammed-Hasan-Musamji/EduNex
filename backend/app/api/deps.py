"""Shared FastAPI dependencies (database sessions, service lookups)."""

from collections.abc import Generator

from sqlalchemy.orm import Session

from app.db.session import get_db as _get_db

DbSession = Session


def get_db() -> Generator[Session, None, None]:
    yield from _get_db()
