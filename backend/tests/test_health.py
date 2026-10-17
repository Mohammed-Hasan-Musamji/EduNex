def test_root_returns_welcome_message(client):
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Welcome to EduNex"
    assert "description" in body


def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_reports_database_and_gemini_status(client):
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ready", "degraded"}
    assert body["dependencies"]["database"]["ok"] is True
    # No GEMINI_API_KEY is set in the test environment.
    assert body["dependencies"]["gemini"]["configured"] is False
