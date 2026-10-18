import json
import uuid
from unittest.mock import patch

import pytest

from app.db.seed import seed_initial_data
from app.models.notification import Notification, NotificationType
from tests.conftest import register
from tests.test_lessons import _fake_lesson_payload


@pytest.fixture
def topic_id(db_session):
    seed_initial_data(db_session)
    from app.models.topic import Topic

    return str(db_session.query(Topic).first().id)


def _generate_lesson(client, topic_id, vark=None):
    body = {"topic_id": topic_id, "prompt": "Explain linked lists"}
    if vark is not None:
        body["vark_preferences"] = vark
    with (
        patch("app.ai.gemini_client.GeminiClient.is_configured", new_callable=lambda: property(lambda self: True)),
        patch("app.ai.gemini_client.GeminiClient.generate_json", return_value=json.dumps(_fake_lesson_payload())),
        patch("app.ai.gemini_client.GeminiClient.embed_texts", return_value=[[0.1] * 768]),
    ):
        response = client.post("/api/v1/lessons", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def test_completing_a_lesson_awards_xp_exactly_once(client, topic_id):
    account = register(client)
    lesson = _generate_lesson(client, topic_id)

    first = client.post(f"/api/v1/lessons/{lesson['id']}/complete")
    assert first.status_code == 200
    body = first.json()
    assert body["already_completed"] is False
    assert body["rewards"]["xp_awarded"] == 20 + 10  # lesson + First Lesson achievement
    assert [a["code"] for a in body["rewards"]["new_achievements"]] == ["first_lesson"]

    again = client.post(f"/api/v1/lessons/{lesson['id']}/complete").json()
    assert again["already_completed"] is True
    assert again["rewards"] is None

    summary = client.get(f"/api/v1/learners/{account['id']}/gamification").json()
    assert summary["xp_total"] == 30
    lessons = client.get(f"/api/v1/learners/{account['id']}/lessons").json()
    assert lessons[0]["completed_at"] is not None
    assert lessons[0]["lesson_title"] == "Understanding Linked Lists"


def test_cannot_complete_someone_elses_lesson(client, topic_id):
    register(client)
    lesson = _generate_lesson(client, topic_id)
    register(client)
    assert client.post(f"/api/v1/lessons/{lesson['id']}/complete").status_code == 403


def test_lesson_falls_back_to_profile_vark_preferences(client, topic_id):
    account = register(client)
    client.put(
        f"/api/v1/learners/{account['id']}/preferences",
        json={"vark_preferences": ["kinesthetic"], "preferred_detail": None, "learning_goal": None},
    )
    assert _generate_lesson(client, topic_id)["vark_preferences"] == ["kinesthetic"]
    # An explicit per-lesson choice still wins.
    assert _generate_lesson(client, topic_id, vark=["visual"])["vark_preferences"] == ["visual"]


def test_notifications_are_private_and_track_read_state(client, db_session):
    owner = register(client)
    db_session.add(
        Notification(
            recipient_id=uuid.UUID(owner["id"]),
            notification_type=NotificationType.level_up,
            title="Level 2",
            body="",
            dedupe_key="level:2",
        )
    )
    db_session.commit()

    listing = client.get("/api/v1/notifications").json()
    assert listing["unread_count"] == 1
    notification_id = listing["items"][0]["id"]

    register(client)  # another learner
    assert client.get("/api/v1/notifications").json()["items"] == []
    assert client.post(f"/api/v1/notifications/{notification_id}/read").status_code == 404

    client.post("/api/v1/auth/login", json={"email": owner["email"], "password": "correct-horse-1"})
    marked = client.post(f"/api/v1/notifications/{notification_id}/read").json()
    assert marked["is_read"] is True
    assert client.get("/api/v1/notifications").json()["unread_count"] == 0


def test_onboarding_can_be_deferred_but_not_self_completed(client):
    account = register(client)
    assert account["onboarding_status"] == "not_started"
    response = client.put(f"/api/v1/learners/{account['id']}/onboarding", json={"status": "skipped"})
    assert response.json()["onboarding_status"] == "skipped"
    response = client.put(f"/api/v1/learners/{account['id']}/onboarding", json={"status": "completed"})
    assert response.status_code == 422


def test_new_learner_analytics_are_empty_not_defaulted(client, topic_id):
    account = register(client)
    body = client.get(f"/api/v1/learners/{account['id']}/analytics").json()
    summary = body["summary"]
    assert summary["overall_accuracy"] is None
    assert summary["questions_answered"] == 0
    assert summary["current_streak"] == 0
    assert summary["concepts_mastered"] == 0
    assert body["score_trend"] == []
    assert all(t["status"] == "not_started" and t["mastery"] is None for t in body["topic_mastery"])
    assert client.get(f"/api/v1/learners/{account['id']}/timeline").json() == []
