import uuid

from tests.conftest import register


def test_invalid_register_body_is_rejected_with_422(client):
    response = client.post("/api/v1/auth/register", json={"email": "missing-fields@example.com"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_learner_routes_require_authentication(client):
    response = client.get(f"/api/v1/learners/{uuid.uuid4()}")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_admin_sees_404_for_a_genuinely_missing_learner(client, admin):
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
    register(client, display_name="Ada")
    response = client.get(f"/api/v1/lessons/{uuid.uuid4()}")
    assert response.status_code == 404


def test_malformed_uuid_path_param_returns_422(client):
    # Authenticate first -- an unauthenticated request to this path returns
    # 401 before path-parameter validation ever runs.
    register(client, display_name="Ada")
    response = client.get("/api/v1/learners/not-a-uuid")
    assert response.status_code == 422


def test_knowledge_base_routes_require_admin(client):
    """An ordinary learner (not an admin) must not reach these routes."""
    register(client, display_name="Ada")
    response = client.get("/api/v1/admin/knowledge-base/documents")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_knowledge_base_document_rejects_empty_text(client, admin):
    response = client.post(
        "/api/v1/admin/knowledge-base/documents",
        json={"title": "Empty doc", "content_type": "text", "text": ""},
    )
    assert response.status_code == 422


def test_knowledge_base_document_rejects_missing_title(client, admin):
    response = client.post(
        "/api/v1/admin/knowledge-base/documents",
        json={"content_type": "text", "text": "Some content"},
    )
    assert response.status_code == 422


def test_ingest_missing_document_returns_404(client, admin):
    response = client.post(f"/api/v1/admin/knowledge-base/documents/{uuid.uuid4()}/ingest")
    assert response.status_code == 404


def test_search_against_empty_knowledge_base_is_safe(client, admin):
    """No documents have been ingested, and GEMINI_API_KEY is unset in the
    test environment -- this must return an empty, clearly-labeled result
    rather than erroring or fabricating matches."""
    response = client.post("/api/v1/admin/knowledge-base/search", json={"query": "anything"})
    assert response.status_code == 200
    body = response.json()
    assert body["results"] == []
    assert body["warning"]


def test_search_rejects_empty_query(client, admin):
    response = client.post("/api/v1/admin/knowledge-base/search", json={"query": ""})
    assert response.status_code == 422
