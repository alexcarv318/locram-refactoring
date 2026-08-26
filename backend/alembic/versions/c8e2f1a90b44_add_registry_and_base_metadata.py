"""add registry entries and base metadata

Revision ID: c8e2f1a90b44
Revises: afad7bd75b73
Create Date: 2026-08-25 18:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c8e2f1a90b44"
down_revision: str | None = "afad7bd75b73"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "registry_entries",
        sa.Column("entry_id", sa.Text(), nullable=False),
        sa.Column("path", sa.Text(), nullable=False),
        sa.Column("base_id", sa.Text(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "agent_access_mode",
            sa.Enum("write", "read", "hidden", name="agentaccessmode", native_enum=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("entry_id"),
        sa.UniqueConstraint("path"),
    )
    op.create_table(
        "base_metadata",
        sa.Column("base_id", sa.Text(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("base_id"),
    )


def downgrade() -> None:
    op.drop_table("base_metadata")
    op.drop_table("registry_entries")
