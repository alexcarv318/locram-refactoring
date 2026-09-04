import re
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from shutil import copy2

import database
from exceptions.backups import (
    BackupExistsError,
    BackupNotFoundError,
    InvalidBackupFilenameError,
)
from interfaces.repositories.backups import IBackupRepository
from schemas.backups import BackupRecord, KnowledgeFileStats


class BackupRepository(IBackupRepository):
    _BACKUP_STEM_PATTERN = re.compile(
        r"^(?P<prefix>\w+)-(?P<trigger>.+)-(?P<created>\d{8}T\d{6}Z)$"
    )
    _BACKUP_STEM_WITHOUT_TIMESTAMP = re.compile(r"^(?P<prefix>\w+)-(?P<trigger>.+)$")

    def __init__(self, source_path: Path) -> None:
        self.source_path = source_path.expanduser().resolve()
        self.backups_path = self.source_path.parent / "backups"

    def create(self, trigger: str) -> BackupRecord:
        self.backups_path.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        filename = self._backup_filename(self._filename_prefix(), trigger, timestamp)
        destination = self.backups_path / filename
        source_connection = sqlite3.connect(str(self.source_path))
        destination_connection = sqlite3.connect(str(destination))

        try:
            source_connection.backup(destination_connection)
        finally:
            destination_connection.close()
            source_connection.close()

        return self._to_record(destination)

    def list_backups(self) -> list[BackupRecord]:
        if not self.backups_path.is_dir():
            return []

        backups = [
            self._to_record(path)
            for path in sorted(self.backups_path.glob("*.db"), reverse=True)
            if self._is_backup_filename(path.name)
        ]

        return backups

    def get(self, filename: str) -> BackupRecord | None:
        path = self.snapshot_path(filename)

        if not path.is_file():
            return None

        return self._to_record(path)

    def delete(self, filename: str) -> bool:
        path = self.snapshot_path(filename)

        if not path.is_file():
            return False

        path.unlink()
        return True

    def rename(self, filename: str, new_filename: str) -> BackupRecord:
        self._validate_filename(new_filename)
        source = self.snapshot_path(filename)

        if not source.is_file():
            raise BackupNotFoundError(filename)

        source_prefix, _, source_created_at = self._parse_stem(source.stem)
        requested_prefix, new_trigger, new_created_at = self._parse_stem(Path(new_filename).stem)
        created_at = new_created_at

        if created_at == "":
            created_at = source_created_at

        if created_at == "" or new_trigger == "":
            raise InvalidBackupFilenameError(new_filename)

        prefix = requested_prefix if requested_prefix != "" else source_prefix
        resolved_name = self._backup_filename(prefix, new_trigger, created_at)
        target = self.snapshot_path(resolved_name)

        if target.exists() and target != source:
            raise BackupExistsError(resolved_name)

        source.rename(target)

        return self._to_record(target)

    def restore(self, snapshot_path: Path) -> BackupRecord:
        resolved = snapshot_path.expanduser().resolve()

        if not resolved.is_file():
            raise BackupNotFoundError(resolved.name)

        pre_restore = self.create("pre_restore")
        database.knowledge_engines.clear()

        if self.source_path.is_file():
            self.source_path.unlink()

        copy2(resolved, self.source_path)
        return pre_restore

    def snapshot_path(self, filename: str) -> Path:
        self._validate_filename(filename)
        candidate = (self.backups_path / filename).resolve()

        if self.backups_path.resolve() not in candidate.parents:
            raise InvalidBackupFilenameError(filename)

        return candidate

    def current_base_id(self) -> str | None:
        return self.read_base_id(self.source_path)

    def read_base_id(self, snapshot_path: Path) -> str | None:
        return self._read_metadata(snapshot_path)[0]

    def read_stats(self, path: Path) -> KnowledgeFileStats:
        size_bytes = path.stat().st_size if path.is_file() else 0
        connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True)

        try:
            now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

            return KnowledgeFileStats(
                page_count=BackupRepository._count(
                    connection,
                    "SELECT COUNT(*) FROM pages WHERE status != 'to_delete'",
                ),
                active_page_count=BackupRepository._count(
                    connection,
                    "SELECT COUNT(*) FROM pages WHERE status = 'active'",
                ),
                embedded_count=BackupRepository._optional_count(
                    connection,
                    "SELECT COUNT(DISTINCT page_id) FROM page_embeddings WHERE field = 'content'",
                ),
                link_count=BackupRepository._count(connection, "SELECT COUNT(*) FROM links"),
                size_bytes=size_bytes,
                orphan_count=BackupRepository._count(
                    connection,
                    "SELECT COUNT(*) FROM pages "
                    "WHERE status = 'active' AND parent_id IS NULL "
                    "AND id NOT IN (SELECT source_id FROM links) "
                    "AND id NOT IN (SELECT target_id FROM links)",
                ),
                unembedded_count=BackupRepository._optional_count(
                    connection,
                    "SELECT COUNT(*) FROM pages WHERE status = 'active' "
                    "AND id NOT IN ("
                    "SELECT page_id FROM page_embeddings WHERE field = 'content'"
                    ")",
                ),
                due_for_review_count=BackupRepository._count(
                    connection,
                    "SELECT COUNT(*) FROM pages WHERE status = 'active' "
                    "AND type != 'fleeting' AND datetime("
                    "COALESCE(reviewed_at, updated_at), "
                    "'+' || review_interval_days || ' days'"
                    ") <= ?",
                    (now,),
                ),
            )
        except sqlite3.Error:
            return KnowledgeFileStats(size_bytes=size_bytes)
        finally:
            connection.close()

    def _to_record(self, path: Path) -> BackupRecord:
        _, trigger, created_at = self._parse_stem(path.stem)

        base_id, source_base_id, display_name, page_count, active_page_count, link_count = (
            self._read_metadata(path)
        )

        return BackupRecord(
            filename=path.name,
            path=str(path),
            size_bytes=path.stat().st_size,
            created_at=created_at,
            trigger=trigger,
            base_id=base_id,
            source_base_id=source_base_id,
            display_name=display_name,
            page_count=page_count,
            active_page_count=active_page_count,
            link_count=link_count,
        )

    def _filename_prefix(self) -> str:
        display_name = self._read_metadata(self.source_path)[2]
        raw = (display_name or self.source_path.stem).strip()
        cleaned = "".join(
            character if character.isalnum() or character == "_" else "_"
            for character in raw
        )
        compact = "_".join(part for part in cleaned.split("_") if part != "")

        if compact == "":
            return "locram"

        return compact

    @staticmethod
    def _backup_filename(prefix: str, trigger: str, created_at: str) -> str:
        return f"{prefix}-{trigger}-{created_at}.db"

    @staticmethod
    def _is_backup_filename(filename: str) -> bool:
        stripped = filename.strip()

        if stripped == "" or Path(stripped).name != stripped or not stripped.endswith(".db"):
            return False

        prefix, trigger, created_at = BackupRepository._parse_stem(Path(stripped).stem)

        return prefix != "" and trigger != "" and created_at != ""

    @staticmethod
    def _validate_filename(filename: str) -> None:
        stripped = filename.strip()

        if stripped == "" or Path(stripped).name != stripped:
            raise InvalidBackupFilenameError(filename)

        if not stripped.endswith(".db"):
            raise InvalidBackupFilenameError(filename)

        prefix, trigger, _created_at = BackupRepository._parse_stem(Path(stripped).stem)

        if prefix == "" or trigger == "":
            raise InvalidBackupFilenameError(filename)

    @staticmethod
    def _parse_stem(stem: str) -> tuple[str, str, str]:
        matched = BackupRepository._BACKUP_STEM_PATTERN.fullmatch(stem)

        if matched is not None:
            return matched.group("prefix"), matched.group("trigger"), matched.group("created")

        without_timestamp = BackupRepository._BACKUP_STEM_WITHOUT_TIMESTAMP.fullmatch(stem)

        if without_timestamp is not None:
            return without_timestamp.group("prefix"), without_timestamp.group("trigger"), ""

        return "", "unknown", ""

    @staticmethod
    def _read_metadata(
        path: Path,
    ) -> tuple[str | None, str | None, str | None, int | None, int | None, int | None]:
        connection = sqlite3.connect(str(path))

        try:
            base_id, display_name = BackupRepository._scalar_pair(
                connection,
                "SELECT base_id, display_name FROM base_metadata LIMIT 1",
            )
            page_count = BackupRepository._scalar_count(connection, "SELECT COUNT(*) FROM pages")
            active_page_count = BackupRepository._scalar_count(
                connection,
                "SELECT COUNT(*) FROM pages WHERE status = 'active'",
            )
            link_count = BackupRepository._scalar_count(connection, "SELECT COUNT(*) FROM links")
        except sqlite3.Error:
            return None, None, None, None, None, None
        finally:
            connection.close()

        return base_id, base_id, display_name, page_count, active_page_count, link_count

    @staticmethod
    def _scalar_pair(
        connection: sqlite3.Connection,
        statement: str,
    ) -> tuple[str | None, str | None]:
        try:
            row = connection.execute(statement).fetchone()
        except sqlite3.Error:
            return None, None

        if row is None:
            return None, None

        first = row[0]
        second = row[1]
        first_text = str(first) if first is not None else None
        second_text = str(second) if second is not None else None
        return first_text, second_text

    @staticmethod
    def _scalar_count(
        connection: sqlite3.Connection,
        statement: str,
        parameters: tuple[str, ...] = (),
    ) -> int | None:
        try:
            row = connection.execute(statement, parameters).fetchone()
        except sqlite3.Error:
            return None

        if row is None or row[0] is None:
            return None

        return int(row[0])

    @staticmethod
    def _count(
        connection: sqlite3.Connection,
        statement: str,
        parameters: tuple[str, ...] = (),
    ) -> int:
        row = connection.execute(statement, parameters).fetchone()

        if row is None or row[0] is None:
            return 0

        return int(row[0])

    @staticmethod
    def _optional_count(
        connection: sqlite3.Connection,
        statement: str,
        parameters: tuple[str, ...] = (),
    ) -> int | None:
        try:
            return BackupRepository._count(connection, statement, parameters)
        except sqlite3.Error:
            return None
