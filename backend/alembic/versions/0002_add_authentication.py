"""Add real authentication fields to learners: email, hashed_password, role.

Additive migration. `email` must end up unique, so it cannot share a single
constant server_default across pre-existing rows (that would collide with
the new unique constraint the moment there is more than one legacy row --
this was caught against a real local database that already had learner rows
from before authentication existed). Instead, existing rows are backfilled
with a deterministic, per-row placeholder email derived from their id before
the unique constraint is created. Those legacy accounts have no usable
password and cannot log in until an admin resets them -- this migration does
not fabricate credentials for them.

Revision ID: 0002_add_authentication
Revises: 0001_initial_schema
Create Date: 2026-10-18
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_add_authentication"
down_revision: str | None = "0001_initial_schema"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    role_enum = sa.Enum("learner", "admin", name="learner_role")
    role_enum.create(bind, checkfirst=True)

    with op.batch_alter_table("learners") as batch_op:
        batch_op.add_column(sa.Column("email", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("hashed_password", sa.String(255), nullable=False, server_default=""))
        batch_op.add_column(sa.Column("role", role_enum, nullable=False, server_default="learner"))

    # Backfill a unique placeholder per existing row -- never a shared
    # constant -- before the column becomes NOT NULL + UNIQUE below.
    op.execute("UPDATE learners SET email = 'legacy-' || id || '@unknown.local' WHERE email IS NULL")

    with op.batch_alter_table("learners") as batch_op:
        batch_op.alter_column("email", existing_type=sa.String(255), nullable=False)
        batch_op.create_unique_constraint("uq_learners_email", ["email"])

    op.create_index("ix_learners_email", "learners", ["email"])

    # Drop the server defaults now that existing rows have been backfilled --
    # new rows must supply real values going forward.
    with op.batch_alter_table("learners") as batch_op:
        batch_op.alter_column("hashed_password", server_default=None)
        batch_op.alter_column("role", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_index("ix_learners_email", table_name="learners")
    with op.batch_alter_table("learners") as batch_op:
        batch_op.drop_constraint("uq_learners_email", type_="unique")
        batch_op.drop_column("role")
        batch_op.drop_column("hashed_password")
        batch_op.drop_column("email")
    sa.Enum(name="learner_role").drop(bind, checkfirst=True)
