def test_create_learner_with_default_preferences(client):
    response = client.post("/api/v1/learners", json={"display_name": "Ada"})
    assert response.status_code == 201
    body = response.json()
    assert body["display_name"] == "Ada"
    assert body["preferences"]["vark_preferences"] == []


def test_create_learner_with_preferences(client):
    response = client.post(
        "/api/v1/learners",
        json={
            "display_name": "Grace",
            "preferences": {"vark_preferences": ["visual", "kinesthetic"], "learning_goal": "Learn linked lists"},
        },
    )
    assert response.status_code == 201
    assert response.json()["preferences"]["vark_preferences"] == ["visual", "kinesthetic"]


def test_create_learner_rejects_invalid_vark_preference(client):
    response = client.post(
        "/api/v1/learners",
        json={"display_name": "Ada", "preferences": {"vark_preferences": ["not-a-real-style"]}},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_learner_rejects_empty_display_name(client):
    response = client.post("/api/v1/learners", json={"display_name": ""})
    assert response.status_code == 422


def test_get_and_update_learner(client):
    created = client.post("/api/v1/learners", json={"display_name": "Ada"}).json()
    learner_id = created["id"]

    response = client.get(f"/api/v1/learners/{learner_id}")
    assert response.status_code == 200
    assert response.json()["display_name"] == "Ada"

    response = client.patch(f"/api/v1/learners/{learner_id}", json={"display_name": "Ada Lovelace"})
    assert response.status_code == 200
    assert response.json()["display_name"] == "Ada Lovelace"


def test_update_and_fetch_preferences(client):
    created = client.post("/api/v1/learners", json={"display_name": "Ada"}).json()
    learner_id = created["id"]

    response = client.put(
        f"/api/v1/learners/{learner_id}/preferences",
        json={"vark_preferences": ["read_write"], "preferred_detail": "concise"},
    )
    assert response.status_code == 200
    assert response.json()["vark_preferences"] == ["read_write"]

    response = client.get(f"/api/v1/learners/{learner_id}/preferences")
    assert response.status_code == 200
    assert response.json()["preferred_detail"] == "concise"
