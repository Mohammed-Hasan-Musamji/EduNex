"""Real PostgreSQL + pgvector checks (skipped unless EDUNEX_TEST_PG_URL is set).

    EDUNEX_TEST_PG_URL=postgresql+psycopg://user:pass@host:5432/empty_db pytest tests/test_postgres_integration.py

The database must be EMPTY and disposable: the test runs every Alembic
migration on it, writes fixture rows, and drops the schema at the end.
Embeddings are deterministic bag-of-words vectors (tests/fakes.py) -- this
verifies the database side (migrations, HNSW index, match_academic_chunks,
filters, RLS, persistence), not Gemini embedding quality.
"""

from __future__ import annotations

import os
import subprocess
import sys
import uuid
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.models.academic_document import AcademicDocument, DocumentContentType, IngestionStatus
from app.models.content_chunk import AcademicContentChunk
from app.models.subject import Subject
from app.rag.retriever import retrieve
from tests.fakes import bag_of_words_vector

PG_URL = os.environ.get("EDUNEX_TEST_PG_URL")
pytestmark = pytest.mark.skipif(not PG_URL, reason="EDUNEX_TEST_PG_URL not set (real PostgreSQL integration test)")
BACKEND = Path(__file__).resolve().parents[1]

TEXTS = {
    "lists": [("A linked list stores values in nodes with a pointer to the next node.", 3),
              ("The head pointer references the first node of a linked list.", 4)],
    "strings": [("Python strings are immutable sequences of characters.", 7)],
}


def alembic(*args: str) -> None:
    env = {**os.environ, "DATABASE_URL": PG_URL}
    subprocess.run([sys.executable, "-m", "alembic", *args], cwd=BACKEND, env=env, check=True, capture_output=True)


@pytest.fixture(scope="module")
def pg():
    alembic("upgrade", "head")
    engine = create_engine(PG_URL)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    with Session() as db:
        ds = Subject(name="Data Structures PG", slug=f"ds-{uuid.uuid4().hex[:6]}", description="", is_active=True)
        py = Subject(name="Python PG", slug=f"py-{uuid.uuid4().hex[:6]}", description="", is_active=True)
        db.add_all([ds, py])
        db.flush()
        docs = {}
        for key, subject, status in (("lists", ds, IngestionStatus.indexed), ("strings", py, IngestionStatus.indexed),
                                     ("draft", ds, IngestionStatus.embedding)):
            doc = AcademicDocument(title=key, source_name=f"{key}.pdf", raw_text="x", content_type=DocumentContentType.text,
                                   subject_id=subject.id, ingestion_status=status, doc_metadata={})
            db.add(doc)
            db.flush()
            for order, (body, page) in enumerate(TEXTS.get(key, TEXTS["lists"])):
                db.add(AcademicContentChunk(document_id=doc.id, chunk_text=body, chunk_order=order, page_start=page,
                                            page_end=page, embedding=bag_of_words_vector(body)))
            docs[key] = doc
        db.commit()
    yield {"engine": engine, "Session": Session, "ds": ds, "py": py, "docs": docs}
    engine.dispose()
    alembic("downgrade", "base")


def test_schema_has_hnsw_index_function_and_rls(pg):
    with pg["engine"].connect() as conn:
        assert conn.execute(text("SELECT extversion FROM pg_extension WHERE extname = 'vector'")).scalar()
        indexdef = conn.execute(
            text("SELECT indexdef FROM pg_indexes WHERE indexname = 'ix_academic_content_chunks_embedding_hnsw'")
        ).scalar()
        assert "hnsw" in indexdef and "vector_cosine_ops" in indexdef
        assert conn.execute(text("SELECT count(*) FROM pg_proc WHERE proname = 'match_academic_chunks'")).scalar() == 1
        dims = conn.execute(text(
            "SELECT atttypmod FROM pg_attribute WHERE attrelid = 'academic_content_chunks'::regclass AND attname = 'embedding'"
        )).scalar()
        assert dims == 768
        not_rls = conn.execute(text(
            "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'alembic_version' AND NOT rowsecurity"
        )).scalar()
        assert not_rls == 0


def test_similarity_search_ranks_filters_and_skips_unindexed(pg):
    with pg["Session"]() as db:
        query = bag_of_words_vector("What does the head pointer of a linked list reference?")
        results = retrieve(db, query, top_k=5, min_similarity=0.1)
        assert results and results[0].chunk_text.startswith("The head pointer")
        assert results[0].page_start == 4
        assert all(r.document_id != pg["docs"]["draft"].id for r in results)  # mid-ingestion document excluded
        scores = [r.similarity_score for r in results]
        assert scores == sorted(scores, reverse=True)

        only_python = retrieve(db, query, top_k=5, min_similarity=0.0, subject_id=pg["py"].id)
        assert {r.document_id for r in only_python} <= {pg["docs"]["strings"].id}
        one_doc = retrieve(db, query, top_k=5, min_similarity=0.0, document_id=pg["docs"]["lists"].id)
        assert {r.document_id for r in one_doc} == {pg["docs"]["lists"].id}
        assert retrieve(db, query, top_k=5, min_similarity=0.99) == []


def test_data_persists_across_new_connections(pg):
    fresh = create_engine(PG_URL)
    try:
        with fresh.connect() as conn:
            stored = conn.execute(text("SELECT count(*) FROM academic_content_chunks WHERE embedding IS NOT NULL")).scalar()
            assert stored == 5  # lists 2 + strings 1 + draft 2
    finally:
        fresh.dispose()


def test_rls_denies_a_non_owner_role(pg):
    role = f"rls_probe_{uuid.uuid4().hex[:6]}"
    with pg["engine"].begin() as conn:
        conn.execute(text(f"CREATE ROLE {role} NOLOGIN"))
        conn.execute(text(f"GRANT SELECT ON learners, academic_content_chunks, assessment_attempts TO {role}"))
    try:
        with pg["engine"].begin() as conn:
            conn.execute(text(f"SET LOCAL ROLE {role}"))
            assert conn.execute(text("SELECT count(*) FROM academic_content_chunks")).scalar() == 0
            assert conn.execute(text("SELECT count(*) FROM learners")).scalar() == 0
    finally:
        with pg["engine"].begin() as conn:
            conn.execute(text(f"REVOKE ALL ON learners, academic_content_chunks, assessment_attempts FROM {role}"))
            conn.execute(text(f"DROP ROLE {role}"))
