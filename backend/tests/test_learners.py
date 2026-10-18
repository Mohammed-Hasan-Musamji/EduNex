from tests.conftest import register


def test_register_creates_account_with_default_preferences(client):
    body = register(client, display_name="Ada")
    assert body["display_name"] == "Ada"
    assert body["role"] == "learner"
    assert "hashed_password" not in body
    assert body["preferences"]["vark_preferences"] == []


def test_register_rejects_duplicate_email(client):
    register(client, display_name="Ada", email="dup@example.com")
    response = client.post(
        "/api/v1/auth/register",
        json={"display_name": "Someone Else", "email": "dup@example.com", "password": "another-pass-1"},
    )
    assert response.status_code == 409


def test_register_rejects_short_password(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"display_name": "Ada", "email": "ada2@example.com", "password": "short"},
    )
    assert response.status_code == 422


def test_login_with_correct_credentials_succeeds(client):
    register(client, display_name="Ada", email="login@example.com", password="correct-horse-1")
    client.cookies.clear()  # simulate a fresh browser session
    response = client.post("/api/v1/auth/login", json={"email": "login@example.com", "password": "correct-horse-1"})
    assert response.status_code == 200
    assert response.json()["display_name"] == "Ada"


def test_login_with_wrong_password_is_rejected(client):
    register(client, display_name="Ada", email="wrongpw@example.com", password="correct-horse-1")
    client.cookies.clear()
    response = client.post("/api/v1/auth/login", json={"email": "wrongpw@example.com", "password": "nope-wrong-1"})
    assert response.status_code == 401


def test_login_with_unknown_email_is_rejected(client):
    response = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "whatever-1"})
    assert response.status_code == 401


def test_unauthenticated_me_is_rejected(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_returns_the_logged_in_account(client):
    registered = register(client, display_name="Ada")
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["id"] == registered["id"]


def test_logout_clears_the_session(client):
    register(client, display_name="Ada")
    assert client.get("/api/v1/auth/me").status_code == 200
    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401


def test_get_and_update_own_learner(client):
    created = register(client, display_name="Ada")
    learner_id = created["id"]

    response = client.get(f"/api/v1/learners/{learner_id}")
    assert response.status_code == 200
    assert response.json()["display_name"] == "Ada"

    response = client.patch(f"/api/v1/learners/{learner_id}", json={"display_name": "Ada Lovelace"})
    assert response.status_code == 200
    assert response.json()["display_name"] == "Ada Lovelace"


def test_cannot_read_another_learners_profile(client):
    first = register(client, display_name="Ada", email="first@example.com")
    client.cookies.clear()
    register(client, display_name="Grace", email="second@example.com")

    response = client.get(f"/api/v1/learners/{first['id']}")
    assert response.status_code == 403


def test_update_and_fetch_preferences(client):
    created = register(client, display_name="Ada")
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
