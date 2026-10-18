"""Grounded textbook Q&A: retrieval, citations, filters, and failure modes (Gemini faked)."""

import uuid

import pytest

from app.ai.gemini_client import get_gemini_client
from app.api.routes import tutor as tutor_routes
from app.core.config import get_settings
from app.models.academic_document import AcademicDocument, DocumentContentType, IngestionStatus
from app.models.content_chunk import AcademicContentChunk
from app.models.subject import Subject
from main import app as fastapi_app
from tests.conftest import register
from tests.fakes import FakeGemini, bag_of_words_vector

LIST_TEXT = "A linked list stores values in nodes; each node keeps a pointer to the next node in the list."
HEAD_TEXT = "The head pointer of a linked list references the first node, and traversal follows next pointers."
STRING_TEXT = "Python strings are immutable sequences of characters that support slicing and concatenation."


def add_document(db, subject, title, source, chunks, status=IngestionStatus.indexed):
    doc = AcademicDocument(
        title=title, source_name=source, raw_text="x", content_type=DocumentContentType.text, subject_id=subject.id,
        ingestion_status=status, doc_metadata={"subject": subject.name, "chapter_title": title},
    )
    db.add(doc)
    db.flush()
    for order, (text, page) in enumerate(chunks):
        db.add(AcademicContentChunk(document_id=doc.id, chunk_text=text, chunk_order=order, page_start=page, page_end=page,
                                    section_title="Basics", embedding=bag_of_words_vector(text)))
    db.commit()
    return doc


@pytest.fixture
def corpus(db_session, monkeypatch):
    monkeypatch.setattr(get_settings(), "rag_min_similarity", 0.2)
    ds = Subject(name="Data Structures", slug="data-structures", description="", is_active=True)
    py = Subject(name="Python", slug="python", description="", is_active=True)
    db_session.add_all([ds, py])
    db_session.flush()
    lists = add_document(db_session, ds, "Linked Lists", "Data structures/lists.pdf", [(LIST_TEXT, 12), (HEAD_TEXT, 13)])
    strings = add_document(db_session, py, "Strings", "Python/Strings.pdf", [(STRING_TEXT, 4)])
    # A document mid-reindex must never be searched.
    add_document(db_session, ds, "Draft", "Data structures/draft.pdf", [(LIST_TEXT, 1)], status=IngestionStatus.embedding)
    return {"ds": ds, "py": py, "lists": lists, "strings": strings}


@pytest.fixture
def fake():
    gemini = FakeGemini()
    fastapi_app.dependency_overrides[get_gemini_client] = lambda: gemini
    tutor_routes.ask_limiter.reset()
    yield gemini
    fastapi_app.dependency_overrides.pop(get_gemini_client, None)


def ask(client, question, **extra):
    return client.post("/api/v1/tutor/ask", json={"question": question, **extra})


def test_grounded_answer_cites_real_chunks_with_db_metadata(client, corpus, fake):
    register(client)
    fake.answer = {
        "answer": "A linked list keeps values in nodes [S1], starting at the head [S2].",
        "support": "full",
        "cited": ["S1", "S2"],
    }
    body = ask(client, "What does a linked list store in its nodes and what is the head pointer?").json()
    assert body["grounded"] is True
    assert body["support"] == "supported"
    assert body["answer"] == "A linked list keeps values in nodes [1], starting at the head [2]."
    assert [s["ref"] for s in body["sources"]] == [1, 2]
    pages = {s["page_start"] for s in body["sources"]}
    assert pages == {12, 13}
    first = body["sources"][0]
    assert first["subject"] == "Data Structures"
    assert first["source_file"] == "Data structures/lists.pdf"
    assert first["document_id"] == str(corpus["lists"].id)
    assert all(s["document_id"] != str(corpus["strings"].id) for s in body["sources"])
    assert body["retrieval"]["retrieved"] >= 2


def test_no_relevant_chunks_answers_not_found_without_calling_the_model(client, corpus, fake):
    register(client)
    body = ask(client, "Explain quantum chromodynamics and gluon confinement").json()
    assert body["grounded"] is False
    assert body["support"] == "not_found"
    assert body["sources"] == []
    assert fake.prompts == []


def test_model_reporting_no_support_is_not_presented_as_fact(client, corpus, fake):
    register(client)
    fake.answer = {"answer": "Linked lists were invented in 1955.", "support": "none", "cited": []}
    body = ask(client, "Who invented the linked list and when?").json()
    assert body["grounded"] is False
    assert "1955" not in body["answer"]
    assert body["sources"] == []


def test_fabricated_citations_are_dropped(client, corpus, fake):
    register(client)
    fake.answer = {"answer": "Nodes hold values [S1] and are sorted [S9].", "support": "full", "cited": ["S1", "S9"]}
    body = ask(client, "What do linked list nodes hold?").json()
    assert len(body["sources"]) == 1
    assert body["answer"] == "Nodes hold values [1] and are sorted."

    fake.answer = {"answer": "Made up [S7].", "support": "full", "cited": ["S7"]}
    body = ask(client, "What do linked list nodes hold?").json()
    assert body["grounded"] is False and body["sources"] == []


def test_subject_and_document_filters(client, corpus, fake, db_session):
    register(client)
    fake.answer = {"answer": "Strings are immutable [S1].", "support": "full", "cited": ["S1"]}
    body = ask(client, "Are Python strings immutable sequences of characters?", subject_id=str(corpus["ds"].id)).json()
    assert body["grounded"] is False  # the strings textbook is in another subject
    assert fake.prompts == [] or "immutable sequences" not in fake.prompts[-1]

    body = ask(client, "Are Python strings immutable sequences of characters?", subject_id=str(corpus["py"].id)).json()
    assert body["grounded"] is True
    assert body["sources"][0]["subject"] == "Python"

    mismatch = ask(client, "linked list nodes", subject_id=str(corpus["py"].id), document_id=str(corpus["lists"].id))
    assert mismatch.status_code == 422
    assert ask(client, "linked list nodes", subject_id=str(uuid.uuid4())).status_code == 404


def test_malformed_requests_are_rejected(client, corpus, fake):
    register(client)
    assert ask(client, "   ").status_code == 422
    assert ask(client, "x" * 1001).status_code == 422
    assert ask(client, "linked lists", top_k=50).status_code == 422


def test_embedding_failure_is_reported_not_faked(client, corpus, fake):
    register(client)
    fake.embed_error = "invalid_api_key"
    response = ask(client, "What is a linked list?")
    assert response.status_code == 503
    assert "invalid_api_key" in response.json()["error"]["message"]


def test_requires_authentication(client, corpus, fake):
    assert ask(client, "What is a linked list?").status_code == 401


def test_rate_limited_per_learner(client, corpus, fake, monkeypatch):
    register(client)
    monkeypatch.setattr(tutor_routes.ask_limiter, "limit", 2)
    assert ask(client, "linked list nodes").status_code == 200
    assert ask(client, "linked list nodes").status_code == 200
    assert ask(client, "linked list nodes").status_code == 429


def test_vark_changes_presentation_instructions_only(client, corpus, fake):
    account = register(client)
    fake.answer = {"answer": "Nodes hold values [S1].", "support": "full", "cited": ["S1"]}
    ask(client, "What do linked list nodes hold?")
    balanced_prompt = fake.prompts[-1]
    client.put(f"/api/v1/learners/{account['id']}/preferences", json={"vark_preferences": ["kinesthetic", "auditory"]})
    body = ask(client, "What do linked list nodes hold?").json()
    assert "worked example" in fake.prompts[-1] and "read aloud" in fake.prompts[-1]
    assert "worked example" not in balanced_prompt
    assert body["personalization"]["vark_preferences"] == ["kinesthetic", "auditory"]
    # Same evidence either way.
    assert balanced_prompt.split("TEXTBOOK EXCERPTS:")[1] == fake.prompts[-1].split("TEXTBOOK EXCERPTS:")[1]


def test_history_is_owner_only(client, corpus, fake):
    first = register(client)
    ask(client, "What is a linked list?")
    assert len(client.get(f"/api/v1/learners/{first['id']}/tutor/history").json()) == 1
    register(client)
    assert client.get(f"/api/v1/learners/{first['id']}/tutor/history").status_code == 403
