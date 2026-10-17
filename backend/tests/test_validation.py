import uuid


def test_invalid_json_body_is_rejected_with_422(client):
    response = client.post("/api/v1/learners", json={"preferences": {"vark_preferences": ["visual"]}})
    # display_name is required
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_missing_learner_returns_404(client):
    response = client.get(f"/api/v1/learners/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_missing_subject_returns_404(client):
    response = client.get(f"/api/v1/subjects/{uuid.uuid4()}")
    assert response.status_code == 404


def test_missing_topic_returns_404(client):
    response = client.get(f"/api/v1/topics/{uuid.uuid4()}")
    assert response.status_code == 404


def test_missing_lesson_session_returns_404(client):
    response = client.get(f"/api/v1/lessons/{uuid.uuid4()}")
    assert response.status_code == 404


def test_malformed_uuid_path_param_returns_422(client):
    response = client.get("/api/v1/learners/not-a-uuid")
    assert response.status_code == 422


def test_knowledge_base_document_rejects_empty_text(client):
    response = client.post(
        "/api/v1/admin/knowledge-base/documents",
        json={"title": "Empty doc", "content_type": "text", "text": ""},
    )
    assert response.status_code == 422


def test_knowledge_base_document_rejects_missing_title(client):
    response = client.post(
        "/api/v1/admin/knowledge-base/documents",
        json={"content_type": "text", "text": "Some content"},
    )
    assert response.status_code == 422


def test_ingest_missing_document_returns_404(client):
    response = client.post(f"/api/v1/admin/knowledge-base/documents/{uuid.uuid4()}/ingest")
    assert response.status_code == 404


def test_search_against_empty_knowledge_base_is_safe(client):
    """No documents have been ingested, and GEMINI_API_KEY is unset in the
    test environment -- this must return an empty, clearly-labeled result
    rather than erroring or fabricating matches."""
    response = client.post("/api/v1/admin/knowledge-base/search", json={"query": "anything"})
    assert response.status_code == 200
    body = response.json()
    assert body["results"] == []
    assert body["warning"]


def test_search_rejects_empty_query(client):
    response = client.post("/api/v1/admin/knowledge-base/search", json={"query": ""})
    assert response.status_code == 422
