"""add change version

Revision ID: e5c3a1b82d09
Revises: d4b8e2c91a07
Create Date: 2026-08-26 18:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e5c3a1b82d09"
down_revision: str | None = "d4b8e2c91a07"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "change_version",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "change_events",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("entity_kind", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Text(), nullable=False),
        sa.Column("operation", sa.Text(), nullable=False),
        sa.Column("occurred_at", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute("INSERT INTO change_version (id, version, updated_at) VALUES ('global', 0, '')")
    op.execute(
        """
        CREATE TRIGGER IF NOT EXISTS change_pages_insert AFTER INSERT ON pages BEGIN
            UPDATE change_version
            SET version = version + 1,
                updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            WHERE id = 'global';

            INSERT INTO change_events (version, entity_kind, entity_id, operation, occurred_at)
            VALUES (
                (SELECT version FROM change_version WHERE id = 'global'),
                'page',
                new.id,
                'insert',
                strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            );
        END
        """
    )
    op.execute(
        """
        CREATE TRIGGER IF NOT EXISTS change_pages_update AFTER UPDATE ON pages BEGIN
            UPDATE change_version
            SET version = version + 1,
                updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            WHERE id = 'global';

            INSERT INTO change_events (version, entity_kind, entity_id, operation, occurred_at)
            VALUES (
                (SELECT version FROM change_version WHERE id = 'global'),
                'page',
                CASE
                    WHEN old.parent_id IS NOT new.parent_id THEN 'topology:' || new.id
                    WHEN old.content IS NOT new.content THEN 'content:' || new.id
                    ELSE 'metadata:' || new.id
                END,
                'update',
                strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            );
        END
        """
    )
    op.execute(
        """
        CREATE TRIGGER IF NOT EXISTS change_pages_delete AFTER DELETE ON pages BEGIN
            UPDATE change_version
            SET version = version + 1,
                updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            WHERE id = 'global';

            INSERT INTO change_events (version, entity_kind, entity_id, operation, occurred_at)
            VALUES (
                (SELECT version FROM change_version WHERE id = 'global'),
                'page',
                old.id,
                'delete',
                strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            );
        END
        """
    )
    op.execute(
        """
        CREATE TRIGGER IF NOT EXISTS change_links_insert AFTER INSERT ON links BEGIN
            UPDATE change_version
            SET version = version + 1,
                updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            WHERE id = 'global';

            INSERT INTO change_events (version, entity_kind, entity_id, operation, occurred_at)
            VALUES (
                (SELECT version FROM change_version WHERE id = 'global'),
                'link',
                new.source_id || ':' || new.target_id || ':' || new.link_type,
                'insert',
                strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            );
        END
        """
    )
    op.execute(
        """
        CREATE TRIGGER IF NOT EXISTS change_links_delete AFTER DELETE ON links BEGIN
            UPDATE change_version
            SET version = version + 1,
                updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            WHERE id = 'global';

            INSERT INTO change_events (version, entity_kind, entity_id, operation, occurred_at)
            VALUES (
                (SELECT version FROM change_version WHERE id = 'global'),
                'link',
                old.source_id || ':' || old.target_id || ':' || old.link_type,
                'delete',
                strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            );
        END
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS change_links_delete")
    op.execute("DROP TRIGGER IF EXISTS change_links_insert")
    op.execute("DROP TRIGGER IF EXISTS change_pages_delete")
    op.execute("DROP TRIGGER IF EXISTS change_pages_update")
    op.execute("DROP TRIGGER IF EXISTS change_pages_insert")
    op.drop_table("change_events")
    op.drop_table("change_version")
