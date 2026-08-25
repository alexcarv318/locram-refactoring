"""create pages and links

Revision ID: afad7bd75b73
Revises:
Create Date: 2026-08-25 17:48:36.833451

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "afad7bd75b73"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pages",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "fleeting",
                "note-taking",
                "permanent",
                "structure",
                "hub",
                name="pagetype",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "active",
                "archived",
                "to_delete",
                name="pagestatus",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("subject", sa.JSON(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("parent_id", sa.Text(), nullable=True),
        sa.Column("content_hash", sa.Text(), nullable=True),
        sa.Column("review_interval_days", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.Column("reviewed_at", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["parent_id"], ["pages.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "links",
        sa.Column("source_id", sa.Text(), nullable=False),
        sa.Column("target_id", sa.Text(), nullable=False),
        sa.Column(
            "link_type",
            sa.Enum(
                "related",
                "extends",
                "extended_by",
                "supports",
                "supported_by",
                "contradicts",
                "contradicted_by",
                "refines",
                "refined_by",
                "questions",
                "questioned_by",
                "reference",
                name="linktype",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["source_id"], ["pages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_id"], ["pages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("source_id", "target_id", "link_type"),
    )
    op.execute(
        """
        CREATE VIRTUAL TABLE IF NOT EXISTS pages_search_index USING fts5(
            title,
            content,
            content = pages,
            content_rowid = rowid,
            tokenize = 'unicode61 remove_diacritics 1'
        )
        """
    )
    op.execute(
        """
        CREATE TRIGGER IF NOT EXISTS pages_search_index_insert AFTER INSERT ON pages BEGIN
            INSERT INTO pages_search_index(rowid, title, content)
            VALUES (new.rowid, new.title, new.content);
        END
        """
    )
    op.execute(
        """
        CREATE TRIGGER IF NOT EXISTS pages_search_index_delete AFTER DELETE ON pages BEGIN
            INSERT INTO pages_search_index(pages_search_index, rowid, title, content)
            VALUES ('delete', old.rowid, old.title, old.content);
        END
        """
    )
    op.execute(
        """
        CREATE TRIGGER IF NOT EXISTS pages_search_index_update AFTER UPDATE ON pages BEGIN
            INSERT INTO pages_search_index(pages_search_index, rowid, title, content)
            VALUES ('delete', old.rowid, old.title, old.content);

            INSERT INTO pages_search_index(rowid, title, content)
            VALUES (new.rowid, new.title, new.content);
        END
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS pages_search_index_update")
    op.execute("DROP TRIGGER IF EXISTS pages_search_index_delete")
    op.execute("DROP TRIGGER IF EXISTS pages_search_index_insert")
    op.execute("DROP TABLE IF EXISTS pages_search_index")
    op.drop_table("links")
    op.drop_table("pages")
