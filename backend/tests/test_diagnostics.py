import pytest

from app.models.assessment import AssessmentQuestion, QuestionType
from app.models.subject import Subject
from app.models.topic import DifficultyLevel, Topic
from tests.conftest import register

TIERS = [DifficultyLevel.beginner, DifficultyLevel.intermediate, DifficultyLevel.advanced]


@pytest.fixture
def subject(db_session):
    """A synthetic test-only subject: two topics (beginner foundation and an
    intermediate follow-on) with questions at every tier."""
    subject = Subject(name="Test Structures", slug="test-structures", description="Fixture", is_active=True)
    db_session.add(subject)
    db_session.flush()
    basics = Topic(subject_id=subject.id, name="Arrays", slug="arrays", description="", difficulty=DifficultyLevel.beginner)
    lists = Topic(subject_id=subject.id, name="Lists", slug="lists", description="", difficulty=DifficultyLevel.intermediate)
    db_session.add_all([basics, lists])
    db_session.flush()
    for topic in (basics, lists):
        for tier in TIERS:
            for n in range(2):
                db_session.add(
                    AssessmentQuestion(
                        topic_id=topic.id,
                        question_text=f"{topic.name} {tier.value} {n}",
                        question_type=QuestionType.multiple_choice,
                        options=["a", "b", "c"],
                        correct_answer=0,
                        explanation="Because a.",
                        difficulty=tier,
                    )
                )
    db_session.commit()
    return subject


def start(client, subject):
    response = client.post("/api/v1/diagnostics", json={"subject_id": str(subject.id)})
    assert response.status_code == 201, response.text
    return response.json()


def answer(client, state, correct: bool):
    response = client.post(
        f"/api/v1/diagnostics/{state['id']}/answers",
        json={"question_id": state["question"]["id"], "submitted_answer": 0 if correct else 1},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_diagnostic_starts_at_baseline_and_never_reveals_answers(client, subject):
    register(client)
    state = start(client, subject)
    assert state["status"] == "in_progress"
    assert state["current_difficulty"] == "intermediate"
    assert state["question"]["difficulty"] == "intermediate"
    assert "correct_answer" not in state["question"]
    assert state["max_questions"] == 8


def test_difficulty_adapts_to_verified_answers(client, subject):
    register(client)
    state = start(client, subject)
    result = answer(client, state, correct=True)
    assert result["attempt"]["is_correct"] is True
    assert result["state"]["question"]["difficulty"] == "advanced"

    result = answer(client, result["state"], correct=False)
    assert result["attempt"]["is_correct"] is False
    assert result["state"]["question"]["difficulty"] == "intermediate"

    result = answer(client, result["state"], correct=False)
    assert result["state"]["question"]["difficulty"] == "beginner"


def test_only_the_served_question_is_accepted(client, subject, db_session):
    register(client)
    state = start(client, subject)
    import uuid

    other = db_session.query(AssessmentQuestion).filter(AssessmentQuestion.id != uuid.UUID(state["question"]["id"])).first()
    response = client.post(
        f"/api/v1/diagnostics/{state['id']}/answers", json={"question_id": str(other.id), "submitted_answer": 0}
    )
    assert response.status_code == 422


def test_starting_again_resumes_the_in_progress_diagnostic(client, subject):
    register(client)
    first = start(client, subject)
    answer(client, first, correct=True)
    resumed = start(client, subject)
    assert resumed["id"] == first["id"]
    assert resumed["answered_count"] == 1


def test_completion_produces_a_grounded_summary(client, subject):
    account = register(client)
    state = start(client, subject)
    me = client.get("/api/v1/auth/me").json()
    assert me["onboarding_status"] == "in_progress"

    results = []
    # Wrong every time: the staircase drops to beginner and the beginner
    # (foundation) topic surfaces as a prerequisite gap.
    while state["status"] == "in_progress":
        result = answer(client, state, correct=False)
        results.append(result)
        state = result["state"]

    assert state["answered_count"] == 8
    summary = state["summary"]
    assert summary["total"] == 8
    assert summary["correct"] == sum(1 for r in results if r["attempt"]["is_correct"])
    assert summary["overall_score"] == round(100 * summary["correct"] / 8, 1)
    beginner = next(b for b in summary["by_difficulty"] if b["difficulty"] == "beginner")
    assert beginner["correct"] == 0
    assert summary["recommended_difficulty"] == "beginner"
    assert summary["coverage"]["topics_total"] == 2
    arrays = next(t for t in summary["topics"] if t["topic_name"] == "Arrays")
    assert arrays["status"] == "needs_attention"
    assert summary["prerequisite_gaps"] == [arrays["topic_id"]]
    assert summary["recommendation"]["topic_name"] == "Arrays"
    assert summary["recommendation"]["activity"] == "lesson"

    # Rewards and onboarding are applied once, at completion.
    final = results[-1]
    assert final["rewards"] is not None
    assert {a["code"] for a in final["rewards"]["new_achievements"]} >= {"starting_point", "first_assessment"}
    assert all(r["rewards"] is None for r in results[:-1])
    assert client.get("/api/v1/auth/me").json()["onboarding_status"] == "completed"

    # Diagnostic answers are real evidence in progress tracking.
    progress = client.get(f"/api/v1/learners/{account['id']}/progress").json()
    assert sum(p["attempts_count"] for p in progress) == 8

    notifications = client.get("/api/v1/notifications").json()
    assert any(n["notification_type"] == "diagnostic_results" for n in notifications["items"])

    after = client.post(
        f"/api/v1/diagnostics/{state['id']}/answers", json={"question_id": results[-1]["attempt"]["question_id"], "submitted_answer": 0}
    )
    assert after.status_code == 422


def test_subject_without_questions_reports_honestly(client, db_session):
    empty = Subject(name="Empty", slug="empty", description="", is_active=True)
    db_session.add(empty)
    db_session.commit()
    register(client)
    response = client.post("/api/v1/diagnostics", json={"subject_id": str(empty.id)})
    assert response.status_code == 422
    assert "no assessment questions" in response.json()["error"]["message"]


def test_other_learners_cannot_read_or_answer_a_diagnostic(client, subject):
    register(client)
    state = start(client, subject)
    register(client)  # switch session to a second learner
    assert client.get(f"/api/v1/diagnostics/{state['id']}").status_code == 403
    response = client.post(
        f"/api/v1/diagnostics/{state['id']}/answers", json={"question_id": state["question"]["id"], "submitted_answer": 0}
    )
    assert response.status_code == 404


def test_build_summary_flags_limited_evidence():
    import uuid

    from app.services.diagnostic_service import build_summary

    subject = Subject(id=uuid.uuid4(), name="S", slug="s", description="", is_active=True)
    topic = Topic(id=uuid.uuid4(), subject_id=subject.id, name="T", slug="t", description="", difficulty=DifficultyLevel.beginner)
    q = AssessmentQuestion(id=uuid.uuid4(), topic_id=topic.id, question_text="?", question_type=QuestionType.true_false,
                           correct_answer=True, explanation="", difficulty=DifficultyLevel.beginner)
    summary = build_summary(subject, [topic], [(q, True)])
    assert summary.coverage.limited_evidence is True
    assert summary.topics[0].limited_evidence is True
    assert summary.topics[0].status == "demonstrated"
    # Everything assessed was right, so start one tier up.
    assert summary.recommended_difficulty == DifficultyLevel.intermediate
