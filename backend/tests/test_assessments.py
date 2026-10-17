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


def test_questions_never_expose_correct_answer(client, seeded_topic_id):
    response = client.get(f"/api/v1/topics/{seeded_topic_id}/questions")
    assert response.status_code == 200
    questions = response.json()
    assert len(questions) >= 1
    for question in questions:
        assert "correct_answer" not in question
        assert "explanation" not in question


def test_correct_multiple_choice_attempt_is_evaluated_server_side(client, seeded_topic_id, learner_id):
    questions = client.get(f"/api/v1/topics/{seeded_topic_id}/questions").json()
    mc_question = next(q for q in questions if q["question_type"] == "multiple_choice")

    # The frontend never supplies correctness -- only an answer index. The
    # server looks up the stored correct_answer itself.
    response = client.post(
        "/api/v1/assessments/attempts",
        json={"learner_id": learner_id, "question_id": mc_question["id"], "submitted_answer": 1},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["is_correct"] is True
    assert body["score"] == 100.0
    assert "explanation" in body


def test_incorrect_attempt_scores_zero(client, seeded_topic_id, learner_id):
    questions = client.get(f"/api/v1/topics/{seeded_topic_id}/questions").json()
    mc_question = next(q for q in questions if q["question_type"] == "multiple_choice")

    response = client.post(
        "/api/v1/assessments/attempts",
        json={"learner_id": learner_id, "question_id": mc_question["id"], "submitted_answer": 0},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["is_correct"] is False
    assert body["score"] == 0.0


def test_attempt_updates_progress(client, seeded_topic_id, learner_id):
    questions = client.get(f"/api/v1/topics/{seeded_topic_id}/questions").json()
    mc_question = next(q for q in questions if q["question_type"] == "multiple_choice")

    client.post(
        "/api/v1/assessments/attempts",
        json={"learner_id": learner_id, "question_id": mc_question["id"], "submitted_answer": 1},
    )

    response = client.get(f"/api/v1/learners/{learner_id}/progress/{seeded_topic_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["attempts_count"] == 1
    assert body["correct_count"] == 1
    assert body["mastery_estimate"] == 100.0


def test_attempt_with_wrong_answer_type_is_rejected(client, seeded_topic_id, learner_id):
    questions = client.get(f"/api/v1/topics/{seeded_topic_id}/questions").json()
    mc_question = next(q for q in questions if q["question_type"] == "multiple_choice")

    response = client.post(
        "/api/v1/assessments/attempts",
        json={"learner_id": learner_id, "question_id": mc_question["id"], "submitted_answer": "not valid"},
    )
    assert response.status_code == 422


def test_attempt_on_missing_question_returns_404(client, learner_id):
    import uuid

    response = client.post(
        "/api/v1/assessments/attempts",
        json={"learner_id": learner_id, "question_id": str(uuid.uuid4()), "submitted_answer": 0},
    )
    assert response.status_code == 404
