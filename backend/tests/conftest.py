"""Shared pytest fixtures.

Tests run against an isolated SQLite file database (never the developer's
own Postgres database), and never make real Gemini API calls -- the Gemini
client is replaced with a fake in `app.api.deps`-overridden dependencies or
monkeypatched directly in the AI service modules per test.
"""

import os
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_edunex.db")
os.environ.setdefault("GEMINI_API_KEY", "")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401  (registers all tables)
from app.api.deps import get_db
from app.db.base import Base
from main import app as fastapi_app

TEST_DB_PATH = "./test_edunex.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def _create_test_schema():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def _clean_tables():
    """Each test starts with empty tables for isolation."""
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def client(db_session):
    def _override_get_db():
        yield db_session

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def new_uuid() -> uuid.UUID:
    return uuid.uuid4()


def register(client: TestClient, display_name: str = "Ada", email: str | None = None, password: str = "correct-horse-1"):
    """Registers a learner and leaves the TestClient holding its session
    cookie, so subsequent requests on the same client are authenticated as
    this learner. Returns the LearnerRead JSON body."""
    email = email or f"{uuid.uuid4().hex[:12]}@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={"display_name": display_name, "email": email, "password": password},
    )
    assert response.status_code == 201, response.text
    return response.json()


def make_admin(db_session, learner_id: str) -> None:
    """Test-only promotion to admin -- there is intentionally no public API
    for this (see backend/README.md)."""
    from app.models.learner import Learner, LearnerRole

    learner = db_session.get(Learner, uuid.UUID(learner_id))
    learner.role = LearnerRole.admin
    db_session.commit()


@pytest.fixture
def admin(client, db_session):
    """Registers an account and promotes it to admin; the shared `client`
    fixture holds its session cookie afterward."""
    account = register(client, display_name="Admin", email=f"admin-{uuid.uuid4().hex[:8]}@example.com")
    make_admin(db_session, account["id"])
    return account
