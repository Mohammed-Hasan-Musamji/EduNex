"""Metadata inference failure handling and repair (chunks/embeddings must not change)."""

import pytest

import scripts.ingest_textbooks as ingest_script
from app.models.academic_document import AcademicDocument
from app.models.content_chunk import AcademicContentChunk
from app.models.topic import Topic
from app.rag.textbook_metadata import needs_metadata_repair
from tests.conftest import TestingSessionLocal, make_admin, register
from tests.fakes import FakeGemini
from tests.test_ingestion import LIST_PAGE, STACK_PAGE, make_pdf

INFERRED = {
    "chapter_title": "Linked Lists and Their Variants",
    "chapter_number": "3",
    "topics": ["singly linked list", "doubly linked list"],
    "keywords": ["node", "pointer"],
    "learning_objectives": ["Implement a singly linked list"],
    "difficulty_estimate": "beginner",
    "review_notes": [],
}


@pytest.fixture
def library(tmp_path):
    root = tmp_path / "Textbook"
    make_pdf(root / "Data structures" / "Linked list.pdf", [LIST_PAGE, STACK_PAGE], toc=[[1, "3.1 SLList", 1]])
    return root


@pytest.fixture
def gemini(monkeypatch):
    fake = FakeGemini(generate_error="server_error")  # metadata model overloaded (HTTP 503)
    monkeypatch.setattr(ingest_script, "GeminiClient", lambda *a, **k: fake)
    monkeypatch.setattr(ingest_script, "SessionLocal", TestingSessionLocal)
    return fake


def run(library, tmp_path, *extra):
    return ingest_script.main(["--root", str(library), "--report-dir", str(tmp_path / "reports"), *extra])


def snapshot(db, document_id):
    db.expire_all()
    return [
        (c.id, c.chunk_order, c.chunk_text, c.page_start, c.page_end, list(c.embedding))
        for c in db.query(AcademicContentChunk).filter_by(document_id=document_id).order_by(AcademicContentChunk.chunk_order)
    ]


def test_metadata_503_does_not_block_embeddings_and_is_recorded(library, tmp_path, gemini, db_session):
    assert run(library, tmp_path) == 0
    doc = db_session.query(AcademicDocument).one()
    assert doc.ingestion_status.value == "indexed"
    assert db_session.query(AcademicContentChunk).filter_by(document_id=doc.id).count() > 0
    meta = doc.doc_metadata
    assert meta["metadata_status"] == "failed" and meta["metadata_error"] == "server_error"
    assert meta["review_required"] is True
    assert meta["provenance"]["chapter_title"] == "fallback"
    assert needs_metadata_repair(meta)


def test_repair_updates_metadata_only(library, tmp_path, gemini, db_session):
    run(library, tmp_path)
    doc = db_session.query(AcademicDocument).one()
    before = snapshot(db_session, doc.id)
    topic_id, topic_slug = doc.topic_id, db_session.get(Topic, doc.topic_id).slug

    gemini.generate_error = None
    gemini.answer = INFERRED
    embed_calls = gemini.embed_calls
    assert run(library, tmp_path, "--repair-metadata") == 0

    db_session.expire_all()
    doc = db_session.query(AcademicDocument).one()
    meta = doc.doc_metadata
    assert meta["metadata_status"] == "inferred" and meta["metadata_model"] == "fake-model"
    assert meta["provenance"]["chapter_title"] == "inferred"
    assert meta["review_required"] is False
    assert meta["metadata_repairs"][-1]["result"] == "inferred"
    assert doc.title == INFERRED["chapter_title"]
    assert snapshot(db_session, doc.id) == before  # same rows, text, pages, and embeddings
    assert gemini.embed_calls == embed_calls  # nothing re-embedded
    topic = db_session.get(Topic, topic_id)
    assert topic.name == INFERRED["chapter_title"] and topic.slug == topic_slug
    chunk = db_session.query(AcademicContentChunk).filter_by(document_id=doc.id).first()
    assert chunk.chunk_metadata["chapter_title"] == INFERRED["chapter_title"]

    # Idempotent: a second repair has nothing to do.
    assert run(library, tmp_path, "--repair-metadata") == 0
    assert len(db_session.query(AcademicDocument).one().doc_metadata["metadata_repairs"]) == 1


def test_repair_that_fails_again_keeps_document_flagged(library, tmp_path, gemini, db_session):
    run(library, tmp_path)
    doc = db_session.query(AcademicDocument).one()
    before = snapshot(db_session, doc.id)
    assert run(library, tmp_path, "--repair-metadata") == 1  # still 503
    db_session.expire_all()
    meta = db_session.query(AcademicDocument).one().doc_metadata
    assert meta["review_required"] is True and meta["metadata_status"] == "failed"
    assert meta["metadata_repairs"][-1] == {**meta["metadata_repairs"][-1], "result": "failed", "error": "server_error"}
    assert snapshot(db_session, doc.id) == before


def test_repair_refuses_when_source_pdf_changed(library, tmp_path, gemini, db_session):
    run(library, tmp_path)
    make_pdf(library / "Data structures" / "Linked list.pdf", ["Completely different content about queues. " * 20])
    gemini.generate_error = None
    gemini.answer = INFERRED
    assert run(library, tmp_path, "--repair-metadata") == 1
    assert db_session.query(AcademicDocument).one().doc_metadata["metadata_status"] == "failed"


def test_legacy_documents_are_detected_by_their_failure_note():
    legacy = {"review_notes": ["AI metadata inference failed (server_error); extracted/fallback values used."]}
    assert needs_metadata_repair(legacy)
    assert not needs_metadata_repair({"review_notes": []})
    assert not needs_metadata_repair({"metadata_status": "inferred"})


def test_admin_can_explicitly_accept_metadata(client, db_session, library, tmp_path, gemini):
    run(library, tmp_path)
    doc = db_session.query(AcademicDocument).one()
    learner = register(client)
    assert client.post(f"/api/v1/admin/knowledge-base/documents/{doc.id}/metadata-review").status_code == 403
    make_admin(db_session, learner["id"])
    body = client.post(f"/api/v1/admin/knowledge-base/documents/{doc.id}/metadata-review").json()
    assert body["review_required"] is False
    db_session.expire_all()
    meta = db_session.query(AcademicDocument).one().doc_metadata
    assert meta["reviewed_by"] == learner["email"] and meta["review_required"] is False
