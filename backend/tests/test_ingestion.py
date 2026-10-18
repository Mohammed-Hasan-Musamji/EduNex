"""Textbook ingestion end to end on SQLite with real PDFs and a fake embedder."""

import json
from pathlib import Path

import pymupdf
import pytest

import scripts.ingest_textbooks as ingest_script
from app.models.academic_document import AcademicDocument, IngestionStatus
from app.models.content_chunk import AcademicContentChunk
from app.models.subject import Subject
from app.models.topic import Topic
from app.rag.ingestion import build_chunks
from tests.conftest import TestingSessionLocal
from tests.fakes import FakeGemini

LIST_PAGE = (
    "Linked Lists\n\nA linked list stores elements in nodes. Each node holds a value and a pointer to the next node. "
    "The head pointer references the first node and traversal follows next pointers until null. " * 3
)
STACK_PAGE = "Stacks\n\nA stack is a last in first out structure. Push adds an element and pop removes the top element. " * 3


def make_pdf(path: Path, pages: list[str], toc: list | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open()
    for text in pages:
        page = doc.new_page()
        if text:
            page.insert_textbox(pymupdf.Rect(50, 50, 550, 800), text, fontsize=10)
    if toc:
        doc.set_toc(toc)
    doc.save(path)
    doc.close()


@pytest.fixture
def library(tmp_path):
    root = tmp_path / "Textbook"
    make_pdf(root / "Data structures" / "lists.pdf", [LIST_PAGE, STACK_PAGE, ""], toc=[[1, "Linked Lists", 1], [1, "Stacks", 2]])
    make_pdf(root / "Python" / "Strings.pdf", ["Strings in Python are immutable sequences of characters. " * 10])
    return root


@pytest.fixture
def fake(monkeypatch):
    gemini = FakeGemini()
    monkeypatch.setattr(ingest_script, "GeminiClient", lambda *a, **k: gemini)
    monkeypatch.setattr(ingest_script, "SessionLocal", TestingSessionLocal)
    return gemini


def run(library, tmp_path, *extra):
    return ingest_script.main(["--root", str(library), "--report-dir", str(tmp_path / "reports"), *extra])


def latest_report(tmp_path) -> dict:
    return json.loads(sorted((tmp_path / "reports").glob("run-*.json"))[-1].read_text())


def test_ingests_pdfs_with_pages_sections_and_catalog(library, tmp_path, fake, db_session):
    assert run(library, tmp_path) == 0
    counts = latest_report(tmp_path)["counts"]
    assert counts["indexed"] == 2
    assert counts["failed"] == 0
    assert counts["needing_ocr"] == 0  # page 3 of lists.pdf is blank, not an image needing OCR

    doc = db_session.query(AcademicDocument).filter_by(source_name="Data structures/lists.pdf").one()
    assert doc.ingestion_status == IngestionStatus.indexed
    assert doc.page_count == 3 and doc.content_hash
    assert doc.doc_metadata["pages_needing_ocr"] == []
    assert doc.doc_metadata["blank_pages"] == [3]
    assert doc.doc_metadata["provenance"]["sections"] == "extracted"
    chunks = db_session.query(AcademicContentChunk).filter_by(document_id=doc.id).order_by(AcademicContentChunk.chunk_order).all()
    assert chunks and all(c.embedding and len(c.embedding) == 768 for c in chunks)
    assert {c.page_start for c in chunks} <= {1, 2}  # never the blank page, never invented
    assert any(c.section_title == "Stacks" and c.page_start == 2 for c in chunks)
    assert counts["chunks_inserted"] == db_session.query(AcademicContentChunk).count()

    subject = db_session.get(Subject, doc.subject_id)
    assert subject.name == "Data Structures"
    assert db_session.get(Topic, doc.topic_id).subject_id == subject.id


def test_rerun_is_idempotent_and_detects_changes(library, tmp_path, fake, db_session):
    run(library, tmp_path)
    chunk_ids = {c.id for c in db_session.query(AcademicContentChunk).all()}
    calls = fake.embed_calls

    assert run(library, tmp_path) == 0
    assert latest_report(tmp_path)["counts"]["skipped_unchanged"] == 2
    assert fake.embed_calls == calls + 1  # only the one-sentence preflight; no document re-embedded
    db_session.expire_all()
    assert {c.id for c in db_session.query(AcademicContentChunk).all()} == chunk_ids
    assert db_session.query(AcademicDocument).count() == 2
    assert db_session.query(Subject).count() == 2

    make_pdf(library / "Python" / "Strings.pdf", ["Strings support slicing and concatenation in Python. " * 10])
    run(library, tmp_path)
    counts = latest_report(tmp_path)["counts"]
    assert counts["indexed"] == 1 and counts["skipped_unchanged"] == 1
    assert db_session.query(AcademicDocument).count() == 2  # updated in place, not duplicated


def test_embedding_failure_marks_failed_and_retry_failed_recovers(library, tmp_path, fake, db_session, monkeypatch):
    fake.embed_error = "rate_limited"  # retryable: passes preflight as a warning, then fails documents
    assert run(library, tmp_path) == 1
    db_session.expire_all()
    docs = db_session.query(AcademicDocument).all()
    assert docs and all(d.ingestion_status == IngestionStatus.failed for d in docs)
    assert all("rate_limited" in (d.failure_detail or "") for d in docs)
    assert db_session.query(AcademicContentChunk).count() == 0  # nothing half-stored

    fake.embed_error = None
    assert run(library, tmp_path, "--retry-failed") == 0
    db_session.expire_all()
    assert all(d.ingestion_status == IngestionStatus.indexed for d in db_session.query(AcademicDocument).all())


def test_permanent_preflight_error_aborts_before_any_work(library, tmp_path, fake, db_session):
    fake.embed_error = "invalid_api_key"
    assert run(library, tmp_path) == 2
    assert db_session.query(AcademicDocument).count() == 0


def test_only_and_dry_run(library, tmp_path, fake, db_session):
    assert run(library, tmp_path, "--dry-run") == 0
    report = latest_report(tmp_path)
    assert report["parsed"] == 2 and report["parse_errors"] == 0
    assert report["needing_ocr"] == 0 and report["with_blank_pages"] == 1
    assert db_session.query(AcademicDocument).count() == 0
    assert fake.embed_calls == 0

    run(library, tmp_path, "--only", "Python/Strings")
    assert [d.source_name for d in db_session.query(AcademicDocument).all()] == ["Python/Strings.pdf"]


def test_failed_metadata_inference_falls_back_honestly(library, tmp_path, fake, db_session):
    fake.generate_error = "rate_limited"
    run(library, tmp_path, "--only", "Python")
    doc = db_session.query(AcademicDocument).one()
    assert doc.ingestion_status == IngestionStatus.indexed
    assert doc.doc_metadata["provenance"]["chapter_title"] == "fallback"
    assert doc.doc_metadata["review_required"] is True


def test_image_only_page_is_flagged_for_ocr_and_review(tmp_path, fake, db_session):
    root = tmp_path / "Textbook"
    path = root / "Physics" / "scan.pdf"
    path.parent.mkdir(parents=True)
    doc = pymupdf.open()
    doc.new_page().insert_textbox(pymupdf.Rect(50, 50, 550, 800), "Momentum is mass times velocity. " * 20, fontsize=10)
    pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 40, 40), False)
    pix.clear_with(200)
    doc.new_page().insert_image(pymupdf.Rect(50, 50, 300, 300), pixmap=pix)
    doc.save(path)
    doc.close()
    assert ingest_script.main(["--root", str(root), "--report-dir", str(tmp_path / "reports")]) == 0
    stored = db_session.query(AcademicDocument).one()
    assert stored.doc_metadata["pages_needing_ocr"] == [2]
    assert stored.doc_metadata["review_required"] is True
    assert all(c.page_start == 1 for c in db_session.query(AcademicContentChunk).all())


def test_chunker_keeps_headings_with_their_text_and_page_ranges():
    raw = (
        "[[PAGE:4]]\nIntroduction To Trees\n\n"
        + "Trees are hierarchical structures of nodes. " * 30
        + "\n\nBinary Search Trees\n\n"
        + "A binary search tree keeps smaller keys on the left. " * 5
        + "\n\n[[PAGE:5]]\n"
        + "Balanced trees keep height logarithmic. " * 20
    )
    chunks = build_chunks(raw, chunk_size=400, overlap=60, sections=[{"title": "Trees", "start_pdf_page": 4}])
    assert all(c.page_start in (4, 5) and c.page_end in (4, 5) for c in chunks)
    assert all(not c.text.splitlines()[-1].startswith("Binary Search Trees") for c in chunks)
    assert any(c.text.startswith(("Binary Search Trees", "Introduction To Trees")) or "\nBinary Search Trees\n" in c.text for c in chunks)
    assert all(c.section_title == "Trees" for c in chunks)
    assert all(len(c.text) <= 400 + 120 for c in chunks)
