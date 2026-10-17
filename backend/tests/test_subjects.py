def test_create_and_update_subject(client, admin):
    response = client.post(
        "/api/v1/admin/subjects", json={"name": "Operating Systems", "description": "Processes, memory, files."}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "operating-systems"
    assert body["is_active"] is True
    subject_id = body["id"]

    response = client.patch(f"/api/v1/admin/subjects/{subject_id}", json={"is_active": False})
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    # Inactive subjects are hidden from the default learner-facing list...
    response = client.get("/api/v1/subjects")
    assert all(s["id"] != subject_id for s in response.json())

    # ...but visible to admin tooling that asks for everything.
    response = client.get("/api/v1/subjects?include_inactive=true")
    assert any(s["id"] == subject_id for s in response.json())


def test_create_subject_rejects_duplicate_name(client, admin):
    first = client.post("/api/v1/admin/subjects", json={"name": "Physics", "description": "..."})
    assert first.status_code == 201

    second = client.post("/api/v1/admin/subjects", json={"name": "Physics", "description": "..."})
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "CONFLICT"


def test_update_missing_subject_returns_404(client, admin):
    import uuid

    response = client.patch(f"/api/v1/admin/subjects/{uuid.uuid4()}", json={"is_active": False})
    assert response.status_code == 404


def test_create_subject_requires_admin(client):
    from tests.conftest import register

    register(client, display_name="Ada")
    response = client.post("/api/v1/admin/subjects", json={"name": "Chemistry", "description": "..."})
    assert response.status_code == 403
