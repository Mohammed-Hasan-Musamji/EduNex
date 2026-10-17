import json
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from app.db.seed import seed_initial_data
from app.schemas.lesson import Lesson

VALID_LESSON_BLOCKS = [
    {"type": "explanation", "heading": "What is a linked list?", "body": "A chain of nodes."},
    {"type": "key_concept", "title": "Head pointer", "explanation": "References the first node."},
    {"type": "step_by_step_example", "title": "Traversal", "steps": ["Start at head", "Follow next", "Stop at null"]},
    {
        "type": "interactive_visualization",
        "component_type": "linked_list",
        "title": "Try it",
        "config": {"node_values": ["1", "2", "3"], "mode": "traversal"},
    },
    {
        "type": "practice_question",
        "prompt": "What does head point to?",
        "options": ["first node", "last node"],
        "correct_option_index": 0,
        "explanation": "Head is first.",
    },
    {"type": "summary", "points": ["Linked lists chain nodes."]},
]


def _fake_lesson_payload():
    return {
        "title": "Understanding Linked Lists",
        "learning_objectives": ["Explain what a linked list is"],
        "blocks": VALID_LESSON_BLOCKS,
        "source_references": [],
        "next_activity": {"type": "practice", "label": "Try a quiz"},
    }


@pytest.fixture
def seeded_topic(db_session):
    seed_initial_data(db_session)
    from app.models.subject import Subject
    from app.models.topic import Topic

    subject = db_session.query(Subject).first()
    topic = db_session.query(Topic).filter(Topic.subject_id == subject.id).first()
    return {"subject_id": str(subject.id), "topic_id": str(topic.id)}


@pytest.fixture
def learner(client):
    return client.post("/api/v1/learners", json={"display_name": "Ada"}).json()


def test_seeded_subject_and_topic_are_exposed(client, seeded_topic):
    response = client.get("/api/v1/subjects")
    assert response.status_code == 200
    names = [s["name"] for s in response.json()]
    assert "Data Structures" in names

    response = client.get(f"/api/v1/subjects/{seeded_topic['subject_id']}/topics")
    assert response.status_code == 200
    topic_names = [t["name"] for t in response.json()]
    assert "Linked Lists" in topic_names


def test_lesson_schema_rejects_malformed_block():
    payload = _fake_lesson_payload()
    payload["id"] = "11111111-1111-1111-1111-111111111111"
    payload["topic"] = {"id": "11111111-1111-1111-1111-111111111111", "name": "Linked Lists"}
    payload["blocks"] = [{"type": "practice_question", "prompt": "Missing options and answer"}]

    with pytest.raises(ValidationError):
        Lesson.model_validate(payload)


def test_lesson_schema_rejects_unknown_block_type():
    payload = _fake_lesson_payload()
    payload["id"] = "11111111-1111-1111-1111-111111111111"
    payload["topic"] = {"id": "11111111-1111-1111-1111-111111111111", "name": "Linked Lists"}
    payload["blocks"] = [{"type": "executable_script", "code": "alert('hi')"}]

    with pytest.raises(ValidationError):
        Lesson.model_validate(payload)


def test_create_lesson_without_gemini_key_returns_503(client, seeded_topic, learner):
    response = client.post(
        "/api/v1/lessons",
        json={
            "learner_id": learner["id"],
            "topic_id": seeded_topic["topic_id"],
            "prompt": "Explain linked lists",
        },
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SERVICE_UNAVAILABLE"


def test_create_lesson_with_mocked_gemini_succeeds(client, seeded_topic, learner):
    with (
        patch("app.ai.gemini_client.GeminiClient.is_configured", new_callable=lambda: property(lambda self: True)),
        patch("app.ai.gemini_client.GeminiClient.generate_json", return_value=json.dumps(_fake_lesson_payload())),
        patch("app.ai.gemini_client.GeminiClient.embed_texts", return_value=[[0.1] * 768]),
    ):
        response = client.post(
            "/api/v1/lessons",
            json={
                "learner_id": learner["id"],
                "topic_id": seeded_topic["topic_id"],
                "prompt": "Explain linked lists",
                "vark_preferences": ["visual"],
            },
        )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "ready"
    assert body["lesson"]["title"] == "Understanding Linked Lists"

    # Session can be fetched and resumed without retyping the prompt.
    lesson_id = body["id"]
    response = client.get(f"/api/v1/lessons/{lesson_id}")
    assert response.status_code == 200
    assert response.json()["prompt"] == "Explain linked lists"

    response = client.get(f"/api/v1/learners/{learner['id']}/lessons")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_create_lesson_missing_learner_returns_404(client, seeded_topic):
    import uuid

    response = client.post(
        "/api/v1/lessons",
        json={"learner_id": str(uuid.uuid4()), "topic_id": seeded_topic["topic_id"], "prompt": "Explain it"},
    )
    assert response.status_code == 404
