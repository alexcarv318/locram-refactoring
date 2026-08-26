"""add page embeddings

Revision ID: d4b8e2c91a07
Revises: c8e2f1a90b44
Create Date: 2026-08-26 17:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d4b8e2c91a07"
down_revision: str | None = "c8e2f1a90b44"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "page_embeddings",
        sa.Column("page_id", sa.Text(), nullable=False),
        sa.Column("field", sa.Text(), nullable=False),
        sa.Column("embedding", sa.LargeBinary(), nullable=False),
        sa.Column("model", sa.Text(), nullable=False),
        sa.Column("dimension", sa.Integer(), nullable=False),
        sa.Column("embedded_at", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("page_id", "field"),
    )


def downgrade() -> None:
    op.drop_table("page_embeddings")
