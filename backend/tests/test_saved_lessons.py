import json
from unittest.mock import patch

import pytest

from app.db.seed import seed_initial_data
from tests.conftest import register
from tests.test_lessons import VALID_LESSON_BLOCKS


@pytest.fixture
def ready_lesson(client, db_session):
    seed_initial_data(db_session)
    from app.models.subject import Subject
    from app.models.topic import Topic

    subject = db_session.query(Subject).first()
    topic = db_session.query(Topic).filter(Topic.subject_id == subject.id).first()

    learner_id = register(client, display_name="Ada")["id"]

    fake_lesson = {
        "title": "Understanding Linked Lists",
        "learning_objectives": ["Explain what a linked list is"],
        "blocks": VALID_LESSON_BLOCKS,
        "source_references": [],
    }
    with (
        patch("app.ai.gemini_client.GeminiClient.is_configured", new_callable=lambda: property(lambda self: True)),
        patch("app.ai.gemini_client.GeminiClient.generate_json", return_value=json.dumps(fake_lesson)),
        patch("app.ai.gemini_client.GeminiClient.embed_texts", return_value=[[0.1] * 768]),
    ):
        response = client.post(
            "/api/v1/lessons",
            json={"topic_id": str(topic.id), "prompt": "Explain linked lists"},
        )
    lesson_id = response.json()["id"]
    return {"learner_id": learner_id, "lesson_id": lesson_id}


def test_save_list_and_remove_a_lesson(client, ready_lesson):
    learner_id, lesson_id = ready_lesson["learner_id"], ready_lesson["lesson_id"]

    response = client.post(f"/api/v1/learners/{learner_id}/saved-lessons/{lesson_id}")
    assert response.status_code == 201

    response = client.get(f"/api/v1/learners/{learner_id}/saved-lessons")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["lesson_title"] == "Understanding Linked Lists"

    response = client.delete(f"/api/v1/learners/{learner_id}/saved-lessons/{lesson_id}")
    assert response.status_code == 204

    response = client.get(f"/api/v1/learners/{learner_id}/saved-lessons")
    assert response.json() == []


def test_saving_the_same_lesson_twice_is_rejected(client, ready_lesson):
    learner_id, lesson_id = ready_lesson["learner_id"], ready_lesson["lesson_id"]

    first = client.post(f"/api/v1/learners/{learner_id}/saved-lessons/{lesson_id}")
    assert first.status_code == 201

    second = client.post(f"/api/v1/learners/{learner_id}/saved-lessons/{lesson_id}")
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "CONFLICT"


def test_removing_an_unsaved_lesson_returns_404(client, ready_lesson):
    learner_id, lesson_id = ready_lesson["learner_id"], ready_lesson["lesson_id"]
    response = client.delete(f"/api/v1/learners/{learner_id}/saved-lessons/{lesson_id}")
    assert response.status_code == 404


def test_saving_a_nonexistent_lesson_returns_404(client, ready_lesson):
    import uuid

    learner_id = ready_lesson["learner_id"]
    response = client.post(f"/api/v1/learners/{learner_id}/saved-lessons/{uuid.uuid4()}")
    assert response.status_code == 404
