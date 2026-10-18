"""Skill profile, snapshots, grounded question generation, review, and selection."""

import uuid

import pytest

from app.ai.gemini_client import get_gemini_client
from app.db.seed import seed_initial_data
from app.models.academic_document import AcademicDocument, DocumentContentType, IngestionStatus
from app.models.assessment import AssessmentQuestion, QuestionType
from app.models.content_chunk import AcademicContentChunk
from app.models.subject import Subject
from app.models.topic import DifficultyLevel, Topic
from app.services.skill_service import estimated_mastery, evidence_level, uncertainty
from main import app as fastapi_app
from tests.conftest import make_admin, register
from tests.fakes import FakeGemini, bag_of_words_vector


def test_estimates_need_evidence_to_move():
    assert estimated_mastery(0, 0) == 50.0
    assert estimated_mastery(1, 1) == pytest.approx(66.7)
    assert estimated_mastery(3, 3) == 80.0  # never 100% from three answers
    assert uncertainty(3, 3) > uncertainty(30, 30)
    assert [evidence_level(n) for n in (0, 1, 4, 5, 11, 12)] == ["none", "low", "low", "medium", "medium", "high"]


@pytest.fixture
def seeded(db_session):
    seed_initial_data(db_session)
    topic = db_session.query(Topic).first()
    questions = [
        AssessmentQuestion(
            topic_id=topic.id,
            question_text=f"Test question {index} about {topic.name}?",
            question_type=QuestionType.multiple_choice,
            options=["a", "b", "c", "d"],
            correct_answer=1,
            explanation=f"Test explanation {index}.",
            difficulty=DifficultyLevel.beginner,
            origin="admin",
        )
        for index in range(3)
    ]
    db_session.add_all(questions)
    db_session.commit()
    return topic, questions


def topic_entry(client, learner_id, topic):
    topics = client.get(f"/api/v1/learners/{learner_id}/skill-profile").json()["topics"]
    return next(t for t in topics if t["topic_id"] == str(topic.id))


def submit(client, topic, questions, correct=True):
    answers = []
    for q in questions:
        right = q.correct_answer
        wrong = (not right) if isinstance(right, bool) else (right + 1) % len(q.options)
        answers.append({"question_id": str(q.id), "submitted_answer": right if correct else wrong})
    body = {"topic_id": str(topic.id), "client_request_id": uuid.uuid4().hex, "answers": answers}
    return client.post("/api/v1/assessments/rounds", json=body)


def test_skill_profile_separates_measured_and_estimated_and_tracks_history(client, seeded):
    topic, questions = seeded
    account = register(client)
    profile = client.get(f"/api/v1/learners/{account['id']}/skill-profile").json()
    entry = next(t for t in profile["topics"] if t["topic_id"] == str(topic.id))
    assert entry["evidence_level"] == "none" and entry["measured_accuracy"] is None and entry["estimated_mastery"] == 50.0
    assert profile["method"]

    submit(client, topic, questions, correct=False)
    submit(client, topic, questions, correct=True)
    entry = topic_entry(client, account["id"], topic)
    assert entry["attempts"] == 6 and entry["correct"] == 3
    assert entry["measured_accuracy"] == 50.0
    assert entry["estimated_mastery"] == 50.0  # (3+1)/(6+2)
    assert entry["evidence_level"] == "medium"
    assert entry["change_since_first_snapshot"] == pytest.approx(50.0 - estimated_mastery(0, 3))

    history = client.get(f"/api/v1/learners/{account['id']}/skill-profile/history", params={"topic_id": str(topic.id)}).json()
    assert [h["measured_accuracy"] for h in history] == [0.0, 100.0]
    assert [h["attempts"] for h in history] == [3, 6]


def test_misconceptions_need_repeated_evidence(client, seeded):
    topic, questions = seeded
    account = register(client)
    submit(client, topic, questions, correct=False)
    entry = topic_entry(client, account["id"], topic)
    assert entry["misconceptions"] == []  # one miss is not a pattern
    submit(client, topic, questions, correct=False)
    entry = topic_entry(client, account["id"], topic)
    assert len(entry["misconceptions"]) == 3 and all(m["times_missed"] == 2 for m in entry["misconceptions"])


def test_skill_profile_is_private(client, seeded):
    first = register(client)
    register(client)
    assert client.get(f"/api/v1/learners/{first['id']}/skill-profile").status_code == 403


def test_question_order_prefers_unanswered(client, seeded):
    topic, questions = seeded
    register(client)
    first_two = client.get(f"/api/v1/topics/{topic.id}/questions", params={"limit": 2}).json()
    answered = [q for q in questions if str(q.id) in {f["id"] for f in first_two}]
    submit(client, topic, answered)
    next_two = client.get(f"/api/v1/topics/{topic.id}/questions", params={"limit": 2}).json()
    unanswered = {str(q.id) for q in questions} - {f["id"] for f in first_two}
    assert next_two[0]["id"] in unanswered


@pytest.fixture
def textbook_topic(db_session):
    subject = Subject(name="Python", slug="python", description="", is_active=True)
    db_session.add(subject)
    db_session.flush()
    topic = Topic(subject_id=subject.id, name="Strings", slug="strings", description="")
    db_session.add(topic)
    db_session.flush()
    doc = AcademicDocument(title="Strings", source_name="Python/Strings.pdf", raw_text="x", content_type=DocumentContentType.text,
                           subject_id=subject.id, topic_id=topic.id, ingestion_status=IngestionStatus.indexed,
                           doc_metadata={"subject": "Python", "chapter_title": "Strings"})
    db_session.add(doc)
    db_session.flush()
    text = "Python strings are immutable: operations such as slicing or concatenation build new string objects. " * 5
    for order in range(3):
        db_session.add(AcademicContentChunk(document_id=doc.id, chunk_text=text, chunk_order=order, page_start=order + 2,
                                            page_end=order + 2, embedding=bag_of_words_vector(text)))
    db_session.commit()
    return subject, topic


GOOD = {"question_text": "What happens when you concatenate two Python strings?", "question_type": "multiple_choice",
        "options": ["A new string object is created", "The first string is modified", "An error is raised", "Nothing"],
        "correct_answer": 0, "explanation": "Strings are immutable, so concatenation builds a new object.", "difficulty": "beginner"}


def test_generated_questions_are_validated_deduplicated_and_traceable(client, db_session, textbook_topic):
    _, topic = textbook_topic
    bad = {**GOOD, "options": ["same", "same", "x", "y"]}
    tf = {"question_text": "Slicing a Python string modifies the original string in place.", "question_type": "true_false",
          "options": None, "correct_answer": False, "explanation": "Slicing returns a new string; strings are immutable.",
          "difficulty": "intermediate"}
    gemini = FakeGemini(answer={"questions": [GOOD, bad, tf, GOOD]})
    fastapi_app.dependency_overrides[get_gemini_client] = lambda: gemini
    try:
        admin = register(client)
        make_admin(db_session, admin["id"])
        report = client.post(f"/api/v1/admin/topics/{topic.id}/questions/generate", json={"excerpts": 1, "per_excerpt": 3}).json()
        assert report == {"topic_id": str(topic.id), "excerpts_used": 1, "accepted": 2, "rejected_invalid": 1, "rejected_duplicate": 1}
        stored = db_session.query(AssessmentQuestion).filter_by(topic_id=topic.id).all()
        assert {q.origin for q in stored} == {"generated"} and {q.review_status for q in stored} == {"unreviewed"}
        assert all(q.source_chunk_id for q in stored)

        public = client.get(f"/api/v1/topics/{topic.id}/questions").json()
        assert public == []  # unreviewed admin-generation drafts aren't learner content
        client.patch(f"/api/v1/admin/questions/{stored[1].id}/review", json={"review_status": "approved"})
        public = client.get(f"/api/v1/topics/{topic.id}/questions").json()
        assert len(public) == 1 and all("correct_answer" not in q for q in public)
        assert {q["source_page"] for q in public} == {2} and {q["source_title"] for q in public} == {"Strings"}

        rejected = stored[0]
        client.patch(f"/api/v1/admin/questions/{rejected.id}/review", json={"review_status": "rejected"})
        assert str(rejected.id) not in {q["id"] for q in client.get(f"/api/v1/topics/{topic.id}/questions").json()}
    finally:
        fastapi_app.dependency_overrides.pop(get_gemini_client, None)


def test_learner_can_generate_new_approved_practice_questions_with_gemini(client, db_session, textbook_topic):
    _, topic = textbook_topic
    db_session.add(
        AssessmentQuestion(
            topic_id=topic.id,
            question_text=GOOD["question_text"],
            question_type=QuestionType.multiple_choice,
            options=GOOD["options"],
            correct_answer=GOOD["correct_answer"],
            explanation=GOOD["explanation"],
            difficulty=DifficultyLevel.beginner,
            origin="seeded",
        )
    )
    db_session.commit()
    register(client)
    gemini = FakeGemini(answer={"questions": [GOOD]})
    fastapi_app.dependency_overrides[get_gemini_client] = lambda: gemini
    try:
        response = client.post(f"/api/v1/topics/{topic.id}/questions/generate")
        assert response.status_code == 200
        assert response.json()["accepted"] == 1
        questions = client.get(f"/api/v1/topics/{topic.id}/questions").json()
        assert len(questions) == 1
        assert questions[0]["origin"] == "generated"
        assert questions[0]["review_status"] == "approved"
        assert "correct_answer" not in questions[0]
        assert "immutable" in gemini.prompts[0]
    finally:
        fastapi_app.dependency_overrides.pop(get_gemini_client, None)


def test_generation_needs_indexed_content_and_admin(client, db_session, seeded):
    topic, _ = seeded
    learner = register(client)
    assert client.post(f"/api/v1/admin/topics/{topic.id}/questions/generate", json={}).status_code == 403
    make_admin(db_session, learner["id"])
    fastapi_app.dependency_overrides[get_gemini_client] = lambda: FakeGemini(answer={"questions": [GOOD]})
    try:
        response = client.post(f"/api/v1/admin/topics/{topic.id}/questions/generate", json={})
        assert response.status_code == 422 and "no indexed textbook content" in response.json()["error"]["message"]
    finally:
        fastapi_app.dependency_overrides.pop(get_gemini_client, None)


def test_gemini_failure_stores_nothing(client, db_session, textbook_topic):
    _, topic = textbook_topic
    admin = register(client)
    make_admin(db_session, admin["id"])
    fastapi_app.dependency_overrides[get_gemini_client] = lambda: FakeGemini(generate_error="rate_limited")
    try:
        assert client.post(f"/api/v1/admin/topics/{topic.id}/questions/generate", json={}).status_code == 503
        assert db_session.query(AssessmentQuestion).filter_by(topic_id=topic.id).count() == 0
    finally:
        fastapi_app.dependency_overrides.pop(get_gemini_client, None)


def test_subject_documents_lists_only_indexed(client, textbook_topic):
    subject, _ = textbook_topic
    docs = client.get(f"/api/v1/subjects/{subject.id}/documents").json()
    assert [d["title"] for d in docs] == ["Strings"] and docs[0]["chunk_count"] == 3
