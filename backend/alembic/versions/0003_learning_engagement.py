"""Learning engagement: assessment rounds + diagnostics, onboarding status,
lesson completion, the learning-event (XP/streak) ledger, achievements, and
in-app notifications.

Additive only. Existing learners start at onboarding_status='not_started'
(they may skip it). Existing assessment attempts keep round_id NULL -- they
were submitted individually before rounds existed and are still counted in
progress and analytics. No XP is backfilled for past activity: rewards are
only ever granted for events the ledger itself observed.

Hand-written; applied and downgraded against SQLite. Run
`alembic upgrade head` against your PostgreSQL instance and report issues.

Revision ID: 0003_learning_engagement
Revises: 0002_add_authentication
Create Date: 2026-10-18
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003_learning_engagement"
down_revision: str | None = "0002_add_authentication"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

# Frozen copy of app/services/gamification_service.ACHIEVEMENT_SPECS at the
# time of this migration. The service re-syncs titles/thresholds at runtime.
ACHIEVEMENTS = [
    ("first_lesson", "First Lesson Completed", "Finish your first lesson on the whiteboard.", "lessons_completed", 1, 10),
    ("first_assessment", "First Assessment Submitted", "Submit a practice round or finish a diagnostic.",
     "assessments_completed", 1, 10),
    ("starting_point", "Starting Point Found", "Complete a skills diagnostic.", "diagnostics_completed", 1, 10),
    ("five_sessions", "Five Learning Sessions",
     "Complete five learning activities: lessons, practice rounds, or diagnostics.", "learning_sessions", 5, 20),
    ("consistent_learner", "Consistent Learner", "Learn on 3 consecutive days.", "best_streak", 3, 25),
    ("concept_mastered", "Concept Mastered", "Reach 80% accuracy on a topic over at least 3 answers.",
     "concepts_mastered", 1, 25),
    ("comeback", "Comeback", "Score 80% or more on a topic after scoring below 60% on it in an earlier round.",
     "recoveries", 1, 25),
    ("subject_milestone", "Subject Milestone", "Practice every topic in a subject at least once.", "subjects_explored", 1, 30),
]


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    bind = op.get_bind()

    onboarding_enum = sa.Enum("not_started", "in_progress", "skipped", "completed", name="onboarding_status")
    onboarding_enum.create(bind, checkfirst=True)
    with op.batch_alter_table("learners") as batch_op:
        batch_op.add_column(sa.Column("onboarding_status", onboarding_enum, nullable=False, server_default="not_started"))

    with op.batch_alter_table("lesson_sessions") as batch_op:
        batch_op.add_column(sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))

    # difficulty_level already exists (0001); reuse it rather than recreate it.
    difficulty_enum = postgresql.ENUM("beginner", "intermediate", "advanced", name="difficulty_level", create_type=False)

    op.create_table(
        "assessment_rounds",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("learner_id", sa.Uuid(), sa.ForeignKey("learners.id", ondelete="CASCADE", name="fk_assessment_rounds_learner_id_learners"), nullable=False),
        sa.Column("kind", sa.Enum("practice", "diagnostic", name="assessment_round_kind"), nullable=False),
        sa.Column("status", sa.Enum("in_progress", "completed", name="assessment_round_status"), nullable=False),
        sa.Column("subject_id", sa.Uuid(), sa.ForeignKey("subjects.id", ondelete="SET NULL", name="fk_assessment_rounds_subject_id_subjects"), nullable=True),
        sa.Column("topic_id", sa.Uuid(), sa.ForeignKey("topics.id", ondelete="SET NULL", name="fk_assessment_rounds_topic_id_topics"), nullable=True),
        sa.Column("client_request_id", sa.String(64), nullable=True),
        sa.Column("current_difficulty", difficulty_enum, nullable=True),
        sa.Column(
            "pending_question_id",
            sa.Uuid(),
            sa.ForeignKey("assessment_questions.id", ondelete="SET NULL", name="fk_assessment_rounds_pending_question_id_assessment_questions"),
            nullable=True,
        ),
        sa.Column("served_question_ids", sa.JSON(), nullable=False),
        sa.Column("max_questions", sa.Integer(), nullable=False),
        sa.Column("correct_count", sa.Integer(), nullable=False),
        sa.Column("total_count", sa.Integer(), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("summary", sa.JSON(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.UniqueConstraint("learner_id", "client_request_id", name="uq_assessment_rounds_learner_id_client_request_id"),
    )
    op.create_index("ix_assessment_rounds_learner_id", "assessment_rounds", ["learner_id"])

    with op.batch_alter_table("assessment_attempts") as batch_op:
        batch_op.add_column(sa.Column("round_id", sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            "fk_assessment_attempts_round_id_assessment_rounds", "assessment_rounds", ["round_id"], ["id"], ondelete="CASCADE"
        )
        batch_op.create_index("ix_assessment_attempts_round_id", ["round_id"])

    op.create_table(
        "learning_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("learner_id", sa.Uuid(), sa.ForeignKey("learners.id", ondelete="CASCADE", name="fk_learning_events_learner_id_learners"), nullable=False),
        sa.Column(
            "event_type",
            sa.Enum(
                "lesson_completed", "practice_round_submitted", "diagnostic_completed", "improvement_demonstrated",
                "concept_mastered", "achievement_earned", name="learning_event_type",
            ),
            nullable=False,
        ),
        sa.Column("event_key", sa.String(200), nullable=False),
        sa.Column("xp_awarded", sa.Integer(), nullable=False),
        sa.Column("activity_date", sa.Date(), nullable=False),
        sa.Column("resource_id", sa.Uuid(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("learner_id", "event_key", name="uq_learning_events_learner_id_event_key"),
    )
    op.create_index("ix_learning_events_learner_id", "learning_events", ["learner_id"])
    op.create_index("ix_learning_events_activity_date", "learning_events", ["activity_date"])

    achievements = op.create_table(
        "achievement_definitions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("code", sa.String(60), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("criteria_type", sa.String(60), nullable=False),
        sa.Column("threshold", sa.Integer(), nullable=False),
        sa.Column("xp_reward", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        *_timestamps(),
        sa.UniqueConstraint("code", name="uq_achievement_definitions_code"),
    )
    op.bulk_insert(
        achievements,
        [
            {
                "id": uuid.uuid4(), "code": code, "title": title, "description": description,
                "criteria_type": criteria, "threshold": threshold, "xp_reward": xp, "sort_order": order,
            }
            for order, (code, title, description, criteria, threshold, xp) in enumerate(ACHIEVEMENTS)
        ],
    )

    op.create_table(
        "learner_achievements",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("learner_id", sa.Uuid(), sa.ForeignKey("learners.id", ondelete="CASCADE", name="fk_learner_achievements_learner_id_learners"), nullable=False),
        sa.Column(
            "achievement_id",
            sa.Uuid(),
            sa.ForeignKey("achievement_definitions.id", ondelete="CASCADE", name="fk_learner_achievements_achievement_id_achievement_definitions"),
            nullable=False,
        ),
        sa.Column("earned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("learner_id", "achievement_id", name="uq_learner_achievements_learner_id_achievement_id"),
    )
    op.create_index("ix_learner_achievements_learner_id", "learner_achievements", ["learner_id"])
    op.create_index("ix_learner_achievements_achievement_id", "learner_achievements", ["achievement_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("recipient_id", sa.Uuid(), sa.ForeignKey("learners.id", ondelete="CASCADE", name="fk_notifications_recipient_id_learners"), nullable=False),
        sa.Column(
            "notification_type",
            sa.Enum("achievement_earned", "level_up", "streak_milestone", "diagnostic_results", "concept_mastered", name="notification_type"),
            nullable=False,
        ),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("resource_type", sa.String(60), nullable=True),
        sa.Column("resource_id", sa.Uuid(), nullable=True),
        sa.Column("dedupe_key", sa.String(200), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("recipient_id", "dedupe_key", name="uq_notifications_recipient_id_dedupe_key"),
    )
    op.create_index("ix_notifications_recipient_id", "notifications", ["recipient_id"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_table("notifications")
    op.drop_table("learner_achievements")
    op.drop_table("achievement_definitions")
    op.drop_table("learning_events")
    with op.batch_alter_table("assessment_attempts") as batch_op:
        batch_op.drop_index("ix_assessment_attempts_round_id")
        batch_op.drop_constraint("fk_assessment_attempts_round_id_assessment_rounds", type_="foreignkey")
        batch_op.drop_column("round_id")
    op.drop_table("assessment_rounds")
    with op.batch_alter_table("lesson_sessions") as batch_op:
        batch_op.drop_column("completed_at")
    with op.batch_alter_table("learners") as batch_op:
        batch_op.drop_column("onboarding_status")
    for enum_name in (
        "notification_type", "learning_event_type", "assessment_round_status", "assessment_round_kind", "onboarding_status",
    ):
        sa.Enum(name=enum_name).drop(bind, checkfirst=True)
