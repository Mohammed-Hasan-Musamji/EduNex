"""Initial schema: learners, subjects, topics, lesson sessions, assessments,
progress, saved lessons, academic documents, and content chunks.

This migration was hand-written against the SQLAlchemy models rather than
produced by `alembic revision --autogenerate`, because no live PostgreSQL
instance was reachable in the development environment it was authored in.
It has been reviewed against app/models/*.py for consistency but has not
been applied against a real PostgreSQL + pgvector database yet -- run
`alembic upgrade head` against your own instance and report any issues.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-10-17
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

from alembic import op

# --- Alembic identifiers ---
revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

# Must match GEMINI_EMBEDDING_DIMENSIONS in .env.example. Changing this later
# requires a new migration (and reindexing/re-embedding existing chunks) --
# vectors of different dimensions cannot coexist in the same column.
EMBEDDING_DIM = 768


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Required for the `embedding` vector column + similarity search below.
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "learners",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("preferences", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "subjects",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("slug", sa.String(140), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("name", name="uq_subjects_name"),
        sa.UniqueConstraint("slug", name="uq_subjects_slug"),
    )
    op.create_index("ix_subjects_slug", "subjects", ["slug"])

    difficulty_enum = sa.Enum("beginner", "intermediate", "advanced", name="difficulty_level", create_type=False)
    difficulty_enum.create(bind, checkfirst=True)

    op.create_table(
        "topics",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "subject_id", sa.Uuid(), sa.ForeignKey("subjects.id", ondelete="CASCADE", name="fk_topics_subject_id_subjects"), nullable=False
        ),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("difficulty", difficulty_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("subject_id", "slug", name="uq_topics_subject_id_slug"),
    )
    op.create_index("ix_topics_subject_id", "topics", ["subject_id"])
    op.create_index("ix_topics_slug", "topics", ["slug"])

    op.create_table(
        "assessment_questions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "topic_id", sa.Uuid(), sa.ForeignKey("topics.id", ondelete="CASCADE", name="fk_assessment_questions_topic_id_topics"), nullable=False
        ),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.Enum("multiple_choice", "true_false", name="question_type"), nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("correct_answer", sa.JSON(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("difficulty", difficulty_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_assessment_questions_topic_id", "assessment_questions", ["topic_id"])

    op.create_table(
        "assessment_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "learner_id", sa.Uuid(), sa.ForeignKey("learners.id", ondelete="CASCADE", name="fk_assessment_attempts_learner_id_learners"), nullable=False
        ),
        sa.Column(
            "question_id",
            sa.Uuid(),
            sa.ForeignKey("assessment_questions.id", ondelete="CASCADE", name="fk_assessment_attempts_question_id_assessment_questions"),
            nullable=False,
        ),
        sa.Column("submitted_answer", sa.JSON(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("feedback", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_assessment_attempts_learner_id", "assessment_attempts", ["learner_id"])
    op.create_index("ix_assessment_attempts_question_id", "assessment_attempts", ["question_id"])

    op.create_table(
        "learner_progress",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "learner_id", sa.Uuid(), sa.ForeignKey("learners.id", ondelete="CASCADE", name="fk_learner_progress_learner_id_learners"), nullable=False
        ),
        sa.Column(
            "topic_id", sa.Uuid(), sa.ForeignKey("topics.id", ondelete="CASCADE", name="fk_learner_progress_topic_id_topics"), nullable=False
        ),
        sa.Column("mastery_estimate", sa.Float(), nullable=False),
        sa.Column("attempts_count", sa.Integer(), nullable=False),
        sa.Column("correct_count", sa.Integer(), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("learner_id", "topic_id", name="uq_learner_progress_learner_id_topic_id"),
    )
    op.create_index("ix_learner_progress_learner_id", "learner_progress", ["learner_id"])
    op.create_index("ix_learner_progress_topic_id", "learner_progress", ["topic_id"])

    lesson_status_enum = sa.Enum("generating", "ready", "failed", name="lesson_session_status")

    op.create_table(
        "lesson_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "learner_id", sa.Uuid(), sa.ForeignKey("learners.id", ondelete="CASCADE", name="fk_lesson_sessions_learner_id_learners"), nullable=False
        ),
        sa.Column(
            "topic_id", sa.Uuid(), sa.ForeignKey("topics.id", ondelete="CASCADE", name="fk_lesson_sessions_topic_id_topics"), nullable=False
        ),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("vark_preferences", sa.JSON(), nullable=False),
        sa.Column("status", lesson_status_enum, nullable=False),
        sa.Column("lesson_json", sa.JSON(), nullable=True),
        sa.Column("source_references", sa.JSON(), nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_lesson_sessions_learner_id", "lesson_sessions", ["learner_id"])
    op.create_index("ix_lesson_sessions_topic_id", "lesson_sessions", ["topic_id"])

    op.create_table(
        "saved_lessons",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "learner_id", sa.Uuid(), sa.ForeignKey("learners.id", ondelete="CASCADE", name="fk_saved_lessons_learner_id_learners"), nullable=False
        ),
        sa.Column(
            "lesson_session_id",
            sa.Uuid(),
            sa.ForeignKey("lesson_sessions.id", ondelete="CASCADE", name="fk_saved_lessons_lesson_session_id_lesson_sessions"),
            nullable=False,
        ),
        sa.Column("saved_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("learner_id", "lesson_session_id", name="uq_saved_lessons_learner_id_lesson_session_id"),
    )
    op.create_index("ix_saved_lessons_learner_id", "saved_lessons", ["learner_id"])
    op.create_index("ix_saved_lessons_lesson_session_id", "saved_lessons", ["lesson_session_id"])

    op.create_table(
        "academic_documents",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("source_name", sa.String(255), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("content_type", sa.Enum("text", "markdown", name="document_content_type"), nullable=False),
        sa.Column(
            "subject_id",
            sa.Uuid(),
            sa.ForeignKey("subjects.id", ondelete="SET NULL", name="fk_academic_documents_subject_id_subjects"),
            nullable=True,
        ),
        sa.Column(
            "ingestion_status",
            sa.Enum("uploaded", "chunking", "embedding", "indexed", "failed", name="ingestion_status"),
            nullable=False,
        ),
        sa.Column("failure_detail", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "academic_content_chunks",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "document_id",
            sa.Uuid(),
            sa.ForeignKey("academic_documents.id", ondelete="CASCADE", name="fk_academic_content_chunks_document_id_academic_documents"),
            nullable=False,
        ),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("chunk_order", sa.Integer(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_academic_content_chunks_document_id", "academic_content_chunks", ["document_id"])

    if bind.dialect.name == "postgresql":
        # IVFFlat index for approximate nearest-neighbor cosine similarity search.
        # Requires at least a few rows to be useful; harmless on an empty table.
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_academic_content_chunks_embedding "
            "ON academic_content_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_academic_content_chunks_embedding")
    op.drop_table("academic_content_chunks")
    op.drop_table("academic_documents")
    sa.Enum(name="ingestion_status").drop(bind, checkfirst=True)
    sa.Enum(name="document_content_type").drop(bind, checkfirst=True)
    op.drop_table("saved_lessons")
    op.drop_table("lesson_sessions")
    sa.Enum(name="lesson_session_status").drop(bind, checkfirst=True)
    op.drop_table("learner_progress")
    op.drop_table("assessment_attempts")
    op.drop_table("assessment_questions")
    sa.Enum(name="question_type").drop(bind, checkfirst=True)
    op.drop_table("topics")
    sa.Enum(name="difficulty_level").drop(bind, checkfirst=True)
    op.drop_table("subjects")
    op.drop_table("learners")
    if bind.dialect.name == "postgresql":
        op.execute("DROP EXTENSION IF EXISTS vector")
