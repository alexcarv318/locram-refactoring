import sqlite3
from pathlib import Path

from alembic.script import ScriptDirectory
from sqlalchemy import select

import database
from database import BaseRepository
from interfaces.repositories.bases import IBaseRegistryRepository, IManagedBaseRepository
from models.bases import RegistryEntry


class BaseRegistryRepository(BaseRepository, IBaseRegistryRepository):
    def get(self, entry_id: str) -> RegistryEntry | None:
        return self.db.get(RegistryEntry, entry_id)

    def get_by_path(self, path: str) -> RegistryEntry | None:
        return self.db.scalar(select(RegistryEntry).where(RegistryEntry.path == path))

    def get_active(self) -> RegistryEntry | None:
        return self.db.scalar(select(RegistryEntry).where(RegistryEntry.is_active.is_(True)))

    def list_entries(self) -> list[RegistryEntry]:
        return list(self.db.scalars(select(RegistryEntry).order_by(RegistryEntry.created_at)))

    def save(self, entry: RegistryEntry) -> RegistryEntry:
        saved = self.db.merge(entry)
        self.db.flush()
        self.db.commit()
        return saved

    def delete(self, entry_id: str) -> None:
        entry = self.get(entry_id)

        if entry is None:
            return

        self.db.delete(entry)
        self.db.flush()
        self.db.commit()

    def set_active(self, entry_id: str) -> None:
        for entry in self.list_entries():
            entry.is_active = entry.entry_id == entry_id
            self.db.merge(entry)

        self.db.flush()
        self.db.commit()


class ManagedBaseRepository(IManagedBaseRepository):
    @staticmethod
    def stamp_schema_version(path: Path) -> None:
        head = ScriptDirectory.from_config(database.alembic_config()).get_current_head()

        if head is None:
            return

        connection = sqlite3.connect(path)

        try:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS alembic_version ("
                "version_num VARCHAR(32) NOT NULL PRIMARY KEY)"
            )
            connection.execute("DELETE FROM alembic_version")
            connection.execute(
                "INSERT INTO alembic_version (version_num) VALUES (?)",
                (head,),
            )
            connection.commit()
        finally:
            connection.close()

    @staticmethod
    def install_pages_search_index(path: Path) -> None:
        connection = sqlite3.connect(path)

        try:
            connection.executescript(
                """
                DROP TRIGGER IF EXISTS fts_insert;
                DROP TRIGGER IF EXISTS fts_delete;
                DROP TRIGGER IF EXISTS fts_update;
                DROP TABLE IF EXISTS pages_fts;
                DROP TRIGGER IF EXISTS pages_search_index_insert;
                DROP TRIGGER IF EXISTS pages_search_index_delete;
                DROP TRIGGER IF EXISTS pages_search_index_update;
                DROP TABLE IF EXISTS pages_search_index;

                CREATE VIRTUAL TABLE pages_search_index USING fts5(
                    title,
                    content,
                    content = pages,
                    content_rowid = rowid,
                    tokenize = 'unicode61 remove_diacritics 1'
                );

                CREATE TRIGGER pages_search_index_insert AFTER INSERT ON pages BEGIN
                    INSERT INTO pages_search_index(rowid, title, content)
                    VALUES (new.rowid, new.title, new.content);
                END;

                CREATE TRIGGER pages_search_index_delete AFTER DELETE ON pages BEGIN
                    INSERT INTO pages_search_index(pages_search_index, rowid, title, content)
                    VALUES ('delete', old.rowid, old.title, old.content);
                END;

                CREATE TRIGGER pages_search_index_update AFTER UPDATE ON pages BEGIN
                    INSERT INTO pages_search_index(pages_search_index, rowid, title, content)
                    VALUES ('delete', old.rowid, old.title, old.content);

                    INSERT INTO pages_search_index(rowid, title, content)
                    VALUES (new.rowid, new.title, new.content);
                END;

                INSERT INTO pages_search_index(pages_search_index) VALUES('rebuild');
                """
            )
            connection.commit()
        finally:
            connection.close()

    @staticmethod
    def read_base_id(path: Path) -> str | None:
        connection = sqlite3.connect(path)

        try:
            exists = connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'base_metadata'"
            ).fetchone()

            if exists is None:
                return None

            row = connection.execute("SELECT base_id FROM base_metadata LIMIT 1").fetchone()

            if row is None:
                return None

            return str(row[0])
        finally:
            connection.close()
