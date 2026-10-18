import uuid

import pytest

from app.db.seed import seed_initial_data
from app.models.assessment import AssessmentQuestion, QuestionType
from app.models.topic import DifficultyLevel
from app.services.progress_service import ProgressService
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
            json={"question_id": mc_question["id"], "submitted_answer": 0},
        )

    response = client.get(f"/api/v1/learners/{learner_id}/recommendations")
    assert response.status_code == 200
    topic_rec = next(r for r in response.json() if r["topic_id"] == seeded_topic_id)
    assert topic_rec["recommendation_type"] == "review"


def test_concurrent_first_attempts_do_not_violate_unique_constraint(seeded_topic_id, learner_id):
    """Regression test: two requests racing to create the first progress row
    for the same (learner, topic) must not crash with a unique-constraint
    IntegrityError. Uses real threads + a barrier so both sessions genuinely
    see "no row yet" before either commits -- the exact interleaving that
    caused the original bug (discovered via two parallel attempt submissions
    from the frontend)."""
    import threading

    from tests.conftest import TestingSessionLocal

    topic_id = uuid.UUID(seeded_topic_id)
    learner_uuid = uuid.UUID(learner_id)
    barrier = threading.Barrier(2)
    errors: list[Exception] = []

    def race(is_correct: bool) -> None:
        session = TestingSessionLocal()
        try:
            service = ProgressService(session)
            assert service.get_progress(learner_uuid, topic_id) is None
            barrier.wait()  # both threads confirm "no row" before either inserts
            service.record_attempt(learner_uuid, topic_id, is_correct)
        except Exception as exc:  # captured for the main thread to assert on
            errors.append(exc)
        finally:
            session.close()

    threads = [threading.Thread(target=race, args=(True,)), threading.Thread(target=race, args=(False,))]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=5)

    assert not errors, f"record_attempt raised under concurrent first-insert race: {errors}"

    verify_session = TestingSessionLocal()
    try:
        final = ProgressService(verify_session).get_progress(learner_uuid, topic_id)
        assert final is not None
        assert final.attempts_count == 2
        assert final.correct_count == 1
    finally:
        verify_session.close()
