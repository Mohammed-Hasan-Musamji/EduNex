from tests.conftest import register


def test_list_users_requires_admin(client):
    register(client, display_name="Ada")
    response = client.get("/api/v1/admin/users")
    assert response.status_code == 403


def test_admin_can_list_real_accounts(client, admin, db_session):
    register_response = register(client, display_name="Grace", email="grace@example.com")
    # re-authenticate as the admin (registering Grace overwrote the session cookie)
    client.post("/api/v1/auth/login", json={"email": admin["email"], "password": "correct-horse-1"})

    response = client.get("/api/v1/admin/users")
    assert response.status_code == 200
    emails = [u["email"] for u in response.json()]
    assert admin["email"] in emails
    assert "grace@example.com" in emails
    assert all("hashed_password" not in u for u in response.json())
    assert register_response["email"] == "grace@example.com"


def test_admin_can_change_another_users_role(client, admin):
    other = register(client, display_name="Grace", email="grace2@example.com")
    client.post("/api/v1/auth/login", json={"email": admin["email"], "password": "correct-horse-1"})

    response = client.patch(f"/api/v1/admin/users/{other['id']}/role", json={"role": "admin"})
    assert response.status_code == 200
    assert response.json()["role"] == "admin"


def test_admin_cannot_change_their_own_role(client, admin):
    response = client.patch(f"/api/v1/admin/users/{admin['id']}/role", json={"role": "learner"})
    assert response.status_code == 422
