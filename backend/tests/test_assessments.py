import uuid

import pytest

from app.db.seed import seed_initial_data
from app.models.assessment import AssessmentQuestion, QuestionType
from app.models.topic import DifficultyLevel, Topic
from tests.conftest import register


@pytest.fixture
def seeded_topic_id(db_session):
    seed_initial_data(db_session)
    from app.models.subject import Subject
    from app.models.topic import Topic

    subject = db_session.query(Subject).first()
    topic = db_session.query(Topic).filter(Topic.subject_id == subject.id).first()
    db_session.add(
        AssessmentQuestion(
            topic_id=topic.id,
            question_text="Which pointer references the first node?",
            question_type=QuestionType.multiple_choice,
            options=["tail", "head", "next", "null"],
            correct_answer=1,
            explanation="The head references the first node.",
            difficulty=DifficultyLevel.beginner,
            origin="admin",
        )
    )
    db_session.commit()
    return str(topic.id)


@pytest.fixture
def learner_id(client):
    return register(client, display_name="Ada")["id"]


def test_questions_never_expose_correct_answer(client, seeded_topic_id):
    response = client.get(f"/api/v1/topics/{seeded_topic_id}/questions")
    assert response.status_code == 200
    questions = response.json()
    assert len(questions) >= 1
    for question in questions:
        assert "correct_answer" not in question
        assert "explanation" not in question


def test_seeded_sample_questions_are_not_served(client, db_session, seeded_topic_id):
    topic = db_session.query(Topic).filter_by(id=uuid.UUID(seeded_topic_id)).first()
    db_session.add(
        AssessmentQuestion(
            topic_id=topic.id,
            question_text="Premade question should not be served",
            question_type=QuestionType.multiple_choice,
            options=["a", "b", "c", "d"],
            correct_answer=0,
            explanation="A test fixture.",
            difficulty=DifficultyLevel.beginner,
            origin="seeded",
        )
    )
    db_session.commit()
    assert all(q["origin"] != "seeded" for q in client.get(f"/api/v1/topics/{seeded_topic_id}/questions").json())


def test_correct_multiple_choice_attempt_is_evaluated_server_side(client, seeded_topic_id, learner_id):
    questions = client.get(f"/api/v1/topics/{seeded_topic_id}/questions").json()
    mc_question = next(q for q in questions if q["question_type"] == "multiple_choice")

    # The frontend never supplies correctness -- only an answer index. The
    # server looks up the stored correct_answer itself.
    response = client.post(
        "/api/v1/assessments/attempts",
        json={"question_id": mc_question["id"], "submitted_answer": 1},
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
        json={"question_id": mc_question["id"], "submitted_answer": 0},
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
        json={"question_id": mc_question["id"], "submitted_answer": 1},
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
        json={"question_id": mc_question["id"], "submitted_answer": "not valid"},
    )
    assert response.status_code == 422


def test_attempt_on_missing_question_returns_404(client, learner_id):
    import uuid

    response = client.post(
        "/api/v1/assessments/attempts",
        json={"question_id": str(uuid.uuid4()), "submitted_answer": 0},
    )
    assert response.status_code == 404
