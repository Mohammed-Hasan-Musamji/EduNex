import uuid

import pytest

from app.db.seed import seed_initial_data
from app.models.assessment import AssessmentQuestion
from tests.conftest import register


@pytest.fixture
def topic_and_questions(db_session):
    seed_initial_data(db_session)
    from app.models.topic import Topic

    topic = db_session.query(Topic).first()
    questions = db_session.query(AssessmentQuestion).filter(AssessmentQuestion.topic_id == topic.id).all()
    return topic, questions


def correct_answers(questions):
    return [{"question_id": str(q.id), "submitted_answer": q.correct_answer} for q in questions]


def wrong_answers(questions):
    out = []
    for q in questions:
        wrong = (not q.correct_answer) if isinstance(q.correct_answer, bool) else (q.correct_answer + 1) % len(q.options)
        out.append({"question_id": str(q.id), "submitted_answer": wrong})
    return out


def submit(client, topic, answers, key=None):
    return client.post(
        "/api/v1/assessments/rounds",
        json={"topic_id": str(topic.id), "client_request_id": key or uuid.uuid4().hex, "answers": answers},
    )


def test_round_is_graded_on_the_server_and_rewards_once(client, topic_and_questions):
    topic, questions = topic_and_questions
    account = register(client)

    response = submit(client, topic, correct_answers(questions), key="round-key-1")
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["correct"] == body["total"] == len(questions)
    assert body["score"] == 100.0
    assert body["replayed"] is False
    # 10 base + 5 for the one correct intermediate question + 30 for mastering
    # the topic, plus achievements: first assessment (10), concept mastered (25),
    # and subject milestone (30) -- the seeded subject has only this one topic.
    rewards = body["rewards"]
    assert rewards["xp_awarded"] == 10 + 5 + 30 + 10 + 25 + 30
    assert rewards["leveled_up"] is True
    codes = {a["code"] for a in rewards["new_achievements"]}
    assert codes == {"first_assessment", "concept_mastered", "subject_milestone"}

    # Retrying the same request replays it -- no second round, no second reward.
    retry = submit(client, topic, correct_answers(questions), key="round-key-1")
    assert retry.status_code == 201
    assert retry.json()["replayed"] is True
    assert retry.json()["rewards"] is None
    assert retry.json()["round_id"] == body["round_id"]

    summary = client.get(f"/api/v1/learners/{account['id']}/gamification").json()
    assert summary["xp_total"] == rewards["xp_total"]
    assert summary["current_streak"] == 1
    earned = [a["code"] for a in summary["achievements"] if a["earned_at"]]
    assert sorted(earned) == sorted(codes)


def test_client_cannot_supply_correctness_or_xp(client, topic_and_questions):
    topic, questions = topic_and_questions
    register(client)
    payload = {
        "topic_id": str(topic.id),
        "client_request_id": uuid.uuid4().hex,
        "answers": [{**a, "is_correct": True} for a in wrong_answers(questions)],
        "xp": 9999,
    }
    body = client.post("/api/v1/assessments/rounds", json=payload).json()
    assert body["correct"] == 0
    # base + first_assessment + subject_milestone -- nothing client-specified.
    assert body["rewards"]["xp_awarded"] == 10 + 10 + 30


def test_improvement_and_comeback_are_measured(client, topic_and_questions):
    topic, questions = topic_and_questions
    account = register(client)
    low = submit(client, topic, wrong_answers(questions)).json()
    assert low["score"] == 0.0
    assert low["previous_score"] is None

    high = submit(client, topic, correct_answers(questions)).json()
    assert high["previous_score"] == 0.0
    codes = {a["code"] for a in high["rewards"]["new_achievements"]}
    assert "comeback" in codes

    timeline = client.get(f"/api/v1/learners/{account['id']}/timeline").json()
    timeline_types = {e["event_type"] for e in timeline}
    assert "improvement_demonstrated" in timeline_types


def test_round_rejects_questions_from_another_topic(client, db_session, topic_and_questions):
    topic, questions = topic_and_questions
    from app.models.topic import DifficultyLevel, Topic

    other = Topic(subject_id=topic.subject_id, name="Stacks", slug="stacks", description="LIFO", difficulty=DifficultyLevel.intermediate)
    db_session.add(other)
    db_session.commit()
    register(client)
    response = submit(client, other, correct_answers(questions))
    assert response.status_code == 422


def test_round_with_invalid_answer_writes_nothing(client, topic_and_questions):
    topic, questions = topic_and_questions
    account = register(client)
    answers = correct_answers(questions)
    answers[-1]["submitted_answer"] = 99 if not isinstance(questions[-1].correct_answer, bool) else 5
    response = submit(client, topic, answers)
    assert response.status_code == 422
    assert client.get(f"/api/v1/learners/{account['id']}/progress").json() == []


def test_daily_xp_limit_still_records_activity(client, topic_and_questions, monkeypatch):
    from app.models.gamification import LearningEventType
    from app.services import gamification_service

    monkeypatch.setitem(gamification_service.DAILY_XP_EVENT_LIMITS, LearningEventType.practice_round_submitted, 1)
    topic, questions = topic_and_questions
    account = register(client)
    submit(client, topic, wrong_answers(questions))
    second = submit(client, topic, wrong_answers(questions)).json()
    assert second["rewards"]["xp_awarded"] == 0
    assert second["rewards"]["notes"]
    analytics = client.get(f"/api/v1/learners/{account['id']}/analytics").json()
    assert analytics["summary"]["assessments_completed"] == 2
