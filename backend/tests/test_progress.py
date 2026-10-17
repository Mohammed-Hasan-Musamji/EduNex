import pytest

from app.db.seed import seed_initial_data


@pytest.fixture
def seeded_topic_id(db_session):
    seed_initial_data(db_session)
    from app.models.subject import Subject
    from app.models.topic import Topic

    subject = db_session.query(Subject).first()
    topic = db_session.query(Topic).filter(Topic.subject_id == subject.id).first()
    return str(topic.id)


@pytest.fixture
def learner_id(client):
    return client.post("/api/v1/learners", json={"display_name": "Ada"}).json()["id"]


def test_progress_for_new_learner_is_a_safe_default(client, seeded_topic_id, learner_id):
    response = client.get(f"/api/v1/learners/{learner_id}/progress/{seeded_topic_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["attempts_count"] == 0
    assert body["mastery_estimate"] == 0.0


def test_progress_for_missing_topic_returns_404(client, learner_id):
    import uuid

    response = client.get(f"/api/v1/learners/{learner_id}/progress/{uuid.uuid4()}")
    assert response.status_code == 404


def test_recommendations_for_learner_with_no_attempts(client, seeded_topic_id, learner_id):
    response = client.get(f"/api/v1/learners/{learner_id}/recommendations")
    assert response.status_code == 200
    recommendations = response.json()
    assert len(recommendations) >= 1
    assert all(r["recommendation_type"] == "beginner_practice" for r in recommendations)


def test_recommendation_switches_to_review_after_repeated_wrong_answers(client, seeded_topic_id, learner_id):
    questions = client.get(f"/api/v1/topics/{seeded_topic_id}/questions").json()
    mc_question = next(q for q in questions if q["question_type"] == "multiple_choice")

    for _ in range(2):
        client.post(
            "/api/v1/assessments/attempts",
            json={"learner_id": learner_id, "question_id": mc_question["id"], "submitted_answer": 0},
        )

    response = client.get(f"/api/v1/learners/{learner_id}/recommendations")
    assert response.status_code == 200
    topic_rec = next(r for r in response.json() if r["topic_id"] == seeded_topic_id)
    assert topic_rec["recommendation_type"] == "review"
