"""RAG for Supabase/pgvector: page-aware chunks, document hashes, chapter
topics, grounded question provenance, skill snapshots, VARK questionnaire
results, tutor history, an HNSW index, a filtered similarity function, and
row-level security.

Additive except for the vector index: the 0001 IVFFlat index (built on an
empty table, so its centroids are meaningless after bulk ingestion) is
replaced by HNSW, which needs no training data and keeps recall stable as
rows are added. Existing data is untouched.

PostgreSQL-only statements (index, function, RLS) are skipped on SQLite,
which is used solely by the automated tests.

Row-level security: every application table gets RLS enabled with NO
policies. The FastAPI backend connects as the table owner (on Supabase:
the `postgres` role via the connection string), which bypasses RLS, and
enforces per-learner ownership itself. Supabase's `anon` and
`authenticated` roles -- the ones a browser holding the public anon key
would use through PostgREST -- therefore see nothing. Do not add
permissive policies unless the frontend is deliberately given direct
table access.

Revision ID: 0004_rag_supabase_vectors
Revises: 0003_learning_engagement
Create Date: 2026-10-18
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_rag_supabase_vectors"
down_revision: str | None = "0003_learning_engagement"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

EMBEDDING_DIM = 768  # must equal GEMINI_EMBEDDING_DIMENSIONS

APP_TABLES = [
    "learners", "subjects", "topics", "assessment_questions", "assessment_attempts", "assessment_rounds",
    "learner_progress", "lesson_sessions", "saved_lessons", "academic_documents", "academic_content_chunks",
    "learning_events", "achievement_definitions", "learner_achievements", "notifications",
    "skill_snapshots", "vark_assessments", "tutor_interactions",
]

MATCH_FUNCTION = f"""
CREATE OR REPLACE FUNCTION match_academic_chunks(
    query_embedding vector({EMBEDDING_DIM}),
    match_count integer DEFAULT 5,
    min_similarity double precision DEFAULT 0.5,
    filter_subject_id uuid DEFAULT NULL,
    filter_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    document_title text,
    subject_id uuid,
    source_name text,
    chunk_text text,
    chunk_order integer,
    page_start integer,
    page_end integer,
    section_title text,
    similarity double precision
)
LANGUAGE sql
STABLE
-- Widen the HNSW candidate list so subject/document filters (applied after
-- the index scan) still return up to match_count rows.
SET hnsw.ef_search = 100
AS $$
    SELECT c.id, c.document_id, d.title::text, d.subject_id, d.source_name::text, c.chunk_text, c.chunk_order,
           c.page_start, c.page_end, c.section_title::text,
           1 - (c.embedding <=> query_embedding) AS similarity
    FROM academic_content_chunks c
    JOIN academic_documents d ON d.id = c.document_id
    WHERE c.embedding IS NOT NULL
      AND d.ingestion_status = 'indexed'
      AND (filter_subject_id IS NULL OR d.subject_id = filter_subject_id)
      AND (filter_document_id IS NULL OR c.document_id = filter_document_id)
      AND 1 - (c.embedding <=> query_embedding) >= min_similarity
    ORDER BY c.embedding <=> query_embedding
    LIMIT LEAST(GREATEST(match_count, 1), 20);
$$;
"""

SUPABASE_ROLES_LOCKDOWN = """
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION match_academic_chunks(vector, integer, double precision, uuid, uuid) FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION match_academic_chunks(vector, integer, double precision, uuid, uuid) FROM authenticated';
    END IF;
END $$;
"""


def upgrade() -> None:
    bind = op.get_bind()
    is_pg = bind.dialect.name == "postgresql"

    with op.batch_alter_table("academic_documents") as batch_op:
        batch_op.add_column(sa.Column("topic_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("content_hash", sa.String(64), nullable=True))
        batch_op.add_column(sa.Column("page_count", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_academic_documents_topic_id_topics", "topics", ["topic_id"], ["id"], ondelete="SET NULL")
        batch_op.create_index("ix_academic_documents_topic_id", ["topic_id"])
        batch_op.create_index("ix_academic_documents_content_hash", ["content_hash"])
    op.create_index("ix_academic_documents_subject_id", "academic_documents", ["subject_id"])

    with op.batch_alter_table("academic_content_chunks") as batch_op:
        batch_op.add_column(sa.Column("page_start", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("page_end", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("section_title", sa.String(255), nullable=True))

    with op.batch_alter_table("assessment_questions") as batch_op:
        batch_op.add_column(sa.Column("origin", sa.String(20), nullable=False, server_default="seeded"))
        batch_op.add_column(sa.Column("review_status", sa.String(20), nullable=False, server_default="approved"))
        batch_op.add_column(sa.Column("source_chunk_id", sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            "fk_assessment_questions_source_chunk_id_academic_content_chunks",
            "academic_content_chunks", ["source_chunk_id"], ["id"], ondelete="SET NULL",
        )

    op.create_table(
        "skill_snapshots",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("learner_id", sa.Uuid(), sa.ForeignKey("learners.id", ondelete="CASCADE", name="fk_skill_snapshots_learner_id_learners"), nullable=False),
        sa.Column("topic_id", sa.Uuid(), sa.ForeignKey("topics.id", ondelete="CASCADE", name="fk_skill_snapshots_topic_id_topics"), nullable=False),
        sa.Column("round_id", sa.Uuid(), sa.ForeignKey("assessment_rounds.id", ondelete="SET NULL", name="fk_skill_snapshots_round_id_assessment_rounds"), nullable=True),
        sa.Column("measured_accuracy", sa.Float(), nullable=True),
        sa.Column("estimated_mastery", sa.Float(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("correct", sa.Integer(), nullable=False),
        sa.Column("evidence_level", sa.String(10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_skill_snapshots_learner_id", "skill_snapshots", ["learner_id"])
    op.create_index("ix_skill_snapshots_topic_id", "skill_snapshots", ["topic_id"])
    op.create_index("ix_skill_snapshots_created_at", "skill_snapshots", ["created_at"])

    op.create_table(
        "vark_assessments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("learner_id", sa.Uuid(), sa.ForeignKey("learners.id", ondelete="CASCADE", name="fk_vark_assessments_learner_id_learners"), nullable=False),
        sa.Column("questionnaire_version", sa.String(20), nullable=False),
        sa.Column("responses", sa.JSON(), nullable=False),
        sa.Column("scores", sa.JSON(), nullable=False),
        sa.Column("preferred", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_vark_assessments_learner_id", "vark_assessments", ["learner_id"])

    op.create_table(
        "tutor_interactions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("learner_id", sa.Uuid(), sa.ForeignKey("learners.id", ondelete="CASCADE", name="fk_tutor_interactions_learner_id_learners"), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("grounded", sa.Boolean(), nullable=False),
        sa.Column("subject_id", sa.Uuid(), sa.ForeignKey("subjects.id", ondelete="SET NULL", name="fk_tutor_interactions_subject_id_subjects"), nullable=True),
        sa.Column(
            "document_id", sa.Uuid(),
            sa.ForeignKey("academic_documents.id", ondelete="SET NULL", name="fk_tutor_interactions_document_id_academic_documents"),
            nullable=True,
        ),
        sa.Column("cited_chunk_ids", sa.JSON(), nullable=False),
        sa.Column("retrieval", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_tutor_interactions_learner_id", "tutor_interactions", ["learner_id"])
    op.create_index("ix_tutor_interactions_created_at", "tutor_interactions", ["created_at"])

    if is_pg:
        op.execute("DROP INDEX IF EXISTS ix_academic_content_chunks_embedding")
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_academic_content_chunks_embedding_hnsw "
            "ON academic_content_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)"
        )
        op.execute(MATCH_FUNCTION)
        op.execute(SUPABASE_ROLES_LOCKDOWN)
        for table in APP_TABLES:
            op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for table in APP_TABLES:
            op.execute(f'ALTER TABLE IF EXISTS "{table}" DISABLE ROW LEVEL SECURITY')
        op.execute("DROP FUNCTION IF EXISTS match_academic_chunks(vector, integer, double precision, uuid, uuid)")
        op.execute("DROP INDEX IF EXISTS ix_academic_content_chunks_embedding_hnsw")
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_academic_content_chunks_embedding "
            "ON academic_content_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
        )

    op.drop_table("tutor_interactions")
    op.drop_table("vark_assessments")
    op.drop_table("skill_snapshots")
    with op.batch_alter_table("assessment_questions") as batch_op:
        batch_op.drop_constraint("fk_assessment_questions_source_chunk_id_academic_content_chunks", type_="foreignkey")
        batch_op.drop_column("source_chunk_id")
        batch_op.drop_column("review_status")
        batch_op.drop_column("origin")
    with op.batch_alter_table("academic_content_chunks") as batch_op:
        batch_op.drop_column("section_title")
        batch_op.drop_column("page_end")
        batch_op.drop_column("page_start")
    op.drop_index("ix_academic_documents_subject_id", table_name="academic_documents")
    with op.batch_alter_table("academic_documents") as batch_op:
        batch_op.drop_index("ix_academic_documents_content_hash")
        batch_op.drop_index("ix_academic_documents_topic_id")
        batch_op.drop_constraint("fk_academic_documents_topic_id_topics", type_="foreignkey")
        batch_op.drop_column("page_count")
        batch_op.drop_column("content_hash")
        batch_op.drop_column("topic_id")
