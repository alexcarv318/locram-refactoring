"""add base share grants

Revision ID: f6d4b3c92e18
Revises: e5c3a1b82d09
Create Date: 2026-08-27 15:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f6d4b3c92e18"
down_revision: str | None = "e5c3a1b82d09"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "base_share_grants",
        sa.Column("grant_id", sa.Text(), nullable=False),
        sa.Column("owner_actor_ref", sa.Text(), nullable=False),
        sa.Column("recipient_actor_ref", sa.Text(), nullable=False),
        sa.Column("base_id", sa.Text(), nullable=False),
        sa.Column("entry_id", sa.Text(), nullable=True),
        sa.Column(
            "permission",
            sa.Enum("read", "write", "admin", name="sharegrantpermission", native_enum=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("last_invited_at", sa.Text(), nullable=True),
        sa.Column("activated_at", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.Text(), nullable=True),
        sa.Column("revoked_at", sa.Text(), nullable=True),
        sa.Column("revocation_reason", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("grant_id"),
    )


def downgrade() -> None:
    op.drop_table("base_share_grants")
