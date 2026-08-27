import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from ulid import ULID

from exceptions.exports import (
    ExportExistsError,
    ExportInspectError,
    ExportNotFoundError,
    InvalidExportFilenameError,
)
from interfaces.repositories.exports import IExportRepository
from schemas.exports import ArtifactInspection, ExportRecord, ExportResult


class ExportRepository(IExportRepository):
    def __init__(self, source_path: Path) -> None:
        self.source_path = source_path.expanduser().resolve()
        self.exports_path = self.source_path.parent / "exports"

    def export_pages(
        self,
        page_ids: list[str],
        package_label: str | None,
        output_path: Path | None,
    ) -> ExportResult:
        artifact_id = str(ULID())
        created_at = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

        if output_path is None:
            timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
            destination = self.exports_path / f"locram-export-{timestamp}-{artifact_id}.db"
        else:
            destination = output_path.expanduser().resolve()

        destination.parent.mkdir(parents=True, exist_ok=True)
        source = sqlite3.connect(str(self.source_path))
        target = sqlite3.connect(str(destination))

        try:
            self._create_tables(target)
            page_count, link_count = self._copy_pages_and_links(source, target, page_ids)
            source_base_id, display_name = self._read_base(source)
            label = package_label or f"scoped export from {display_name}"

            target.execute(
                """
                INSERT INTO base_metadata (base_id, display_name)
                VALUES (?, ?)
                """,
                (source_base_id, display_name),
            )
            target.execute(
                """
                INSERT INTO artifact_metadata (
                    artifact_id,
                    artifact_kind,
                    source_base_id,
                    package_label,
                    created_at
                )
                VALUES (?, 'export', ?, ?, ?)
                """,
                (artifact_id, source_base_id, label, created_at),
            )
            target.commit()
        except sqlite3.Error:
            destination.unlink(missing_ok=True)
            raise
        finally:
            target.close()
            source.close()

        return ExportResult(
            artifact_id=artifact_id,
            source_base_id=source_base_id,
            output_path=str(destination),
            page_count=page_count,
            link_count=link_count,
        )

    def list_exports(self) -> list[ExportRecord]:
        if not self.exports_path.is_dir():
            return []

        records: list[ExportRecord] = []

        for path in sorted(self.exports_path.glob("*.db"), reverse=True):
            inspection = self.inspect(path)

            if inspection.artifact_class != "scoped_export":
                continue

            records.append(self._to_record(path, inspection))

        return records

    def delete(self, filename: str) -> bool:
        path = self.export_path(filename)

        if not path.is_file():
            return False

        path.unlink()
        return True

    def rename(self, filename: str, new_filename: str) -> ExportRecord:
        source = self.export_path(filename)
        target = self.export_path(new_filename)

        if not source.is_file():
            raise ExportNotFoundError(filename)

        if target.exists():
            raise ExportExistsError(new_filename)

        source.rename(target)

        return self._to_record(target, self.inspect(target))

    def inspect(self, path: Path) -> ArtifactInspection:
        resolved = path.expanduser().resolve()

        if not resolved.is_file():
            raise ExportInspectError(f"File does not exist: {resolved}")

        connection = sqlite3.connect(f"file:{resolved}?mode=ro", uri=True)

        try:
            return self._inspect_file(connection, resolved)
        except sqlite3.Error as error:
            return self._unreadable(resolved, f"Cannot read as SQLite: {error}")
        finally:
            connection.close()

    def export_path(self, filename: str) -> Path:
        stripped = filename.strip()

        if stripped == "" or Path(stripped).name != stripped or not stripped.endswith(".db"):
            raise InvalidExportFilenameError(filename)

        candidate = (self.exports_path / stripped).resolve()

        if self.exports_path.resolve() not in candidate.parents:
            raise InvalidExportFilenameError(filename)

        return candidate

    def _copy_pages_and_links(
        self,
        source: sqlite3.Connection,
        target: sqlite3.Connection,
        page_ids: list[str],
    ) -> tuple[int, int]:
        placeholders = ",".join("?" for _ in page_ids)
        pages = source.execute(
            f"""
            SELECT
                id,
                title,
                content,
                type,
                status,
                subject,
                tags,
                parent_id,
                content_hash,
                review_interval_days,
                created_at,
                updated_at,
                reviewed_at
            FROM pages
            WHERE id IN ({placeholders})
            """,
            page_ids,
        ).fetchall()
        exported_ids = {str(page[0]) for page in pages}

        for (
            page_id,
            title,
            content,
            page_type,
            status,
            subject,
            tags,
            parent_id,
            content_hash,
            review_interval_days,
            page_created_at,
            updated_at,
            reviewed_at,
        ) in pages:
            kept_parent_id = parent_id

            if parent_id is not None and str(parent_id) not in exported_ids:
                kept_parent_id = None

            target.execute(
                """
                INSERT INTO pages (
                    id,
                    title,
                    content,
                    type,
                    status,
                    subject,
                    tags,
                    parent_id,
                    content_hash,
                    review_interval_days,
                    created_at,
                    updated_at,
                    reviewed_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    page_id,
                    title,
                    content,
                    page_type,
                    status,
                    subject,
                    tags,
                    kept_parent_id,
                    content_hash,
                    review_interval_days,
                    page_created_at,
                    updated_at,
                    reviewed_at,
                ),
            )

        links = source.execute(
            f"""
            SELECT source_id, target_id, link_type, created_at
            FROM links
            WHERE source_id IN ({placeholders})
              AND target_id IN ({placeholders})
            """,
            page_ids + page_ids,
        ).fetchall()

        for link in links:
            target.execute(
                """
                INSERT INTO links (source_id, target_id, link_type, created_at)
                VALUES (?, ?, ?, ?)
                """,
                link,
            )

        return len(pages), len(links)

    def _inspect_file(
        self,
        connection: sqlite3.Connection,
        path: Path,
    ) -> ArtifactInspection:
        tables = {
            str(row[0])
            for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
        }

        if "pages" not in tables or "links" not in tables:
            return self._unreadable(path, "Missing required tables (pages or links)")

        base_row = None

        if "base_metadata" in tables:
            base_row = connection.execute(
                "SELECT base_id, display_name FROM base_metadata LIMIT 1"
            ).fetchone()

        artifact_row = None

        if "artifact_metadata" in tables:
            artifact_row = connection.execute(
                """
                SELECT artifact_id, artifact_kind, source_base_id, package_label, created_at
                FROM artifact_metadata
                LIMIT 1
                """
            ).fetchone()

        page_count = self._count(connection, "SELECT COUNT(*) FROM pages")
        active_page_count = self._count(
            connection,
            "SELECT COUNT(*) FROM pages WHERE status = 'active'",
        )
        link_count = self._count(connection, "SELECT COUNT(*) FROM links")
        base_id = self._cell(base_row, 0)
        display_name = self._cell(base_row, 1)
        artifact_id = self._cell(artifact_row, 0)
        artifact_kind = self._cell(artifact_row, 1)
        source_base_id = self._cell(artifact_row, 2)
        package_label = self._cell(artifact_row, 3)
        created_at = self._cell(artifact_row, 4)

        if artifact_kind == "export":
            artifact_class = "scoped_export"
            valid_actions = ["register_as_base", "merge_into_active"]
            coverage = "db_only"
            origin = source_base_id or base_id or "unknown"
            provenance = f"scoped export artifact {artifact_id or 'unknown'} from base {origin}"
            summary = (
                f"Scoped export {package_label or display_name or origin}: "
                f"{page_count} pages. Can merge or register."
            )
        elif artifact_kind == "snapshot":
            artifact_class = "snapshot"
            valid_actions = ["register_as_base", "merge_into_active", "restore"]
            coverage = "db_only"
            provenance = f"snapshot from base {source_base_id or base_id or 'unknown'}"
            summary = "Backup snapshot - can merge, restore, or register as a working base"
        else:
            artifact_class = "ordinary_base"
            valid_actions = ["register_as_base", "merge_into_active", "restore"]
            coverage = None
            provenance = f"ordinary locram base {base_id or 'unknown'}"
            summary = (
                f"Ordinary locram base ({display_name or base_id or 'unknown'}): "
                f"{page_count} pages. Can merge, restore, or register."
            )

        return ArtifactInspection(
            path=str(path),
            artifact_class=artifact_class,
            compatibility="ready",
            base_id=base_id,
            artifact_id=artifact_id,
            display_name=display_name,
            schema_version=None,
            artifact_schema_family=None,
            artifact_schema_version=None,
            created_at=created_at,
            package_label=package_label,
            page_count=page_count,
            active_page_count=active_page_count,
            link_count=link_count,
            source_base_id=source_base_id,
            provenance_summary=provenance,
            attachment_coverage_label=coverage,
            valid_actions=valid_actions,
            errors=[],
            summary=summary,
        )

    @staticmethod
    def _create_tables(connection: sqlite3.Connection) -> None:
        connection.executescript(
            """
            CREATE TABLE pages (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                type TEXT NOT NULL DEFAULT 'fleeting',
                status TEXT NOT NULL DEFAULT 'active',
                subject TEXT NOT NULL DEFAULT '[]',
                tags TEXT NOT NULL DEFAULT '[]',
                parent_id TEXT,
                content_hash TEXT,
                review_interval_days INTEGER NOT NULL DEFAULT 7,
                created_at TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT '',
                reviewed_at TEXT
            );

            CREATE TABLE links (
                source_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                link_type TEXT NOT NULL DEFAULT 'related',
                created_at TEXT NOT NULL DEFAULT '',
                PRIMARY KEY (source_id, target_id, link_type)
            );

            CREATE TABLE base_metadata (
                base_id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL
            );

            CREATE TABLE artifact_metadata (
                artifact_id TEXT PRIMARY KEY,
                artifact_kind TEXT NOT NULL,
                source_base_id TEXT NOT NULL,
                package_label TEXT,
                created_at TEXT NOT NULL
            );
            """
        )

    @staticmethod
    def _read_base(connection: sqlite3.Connection) -> tuple[str, str]:
        row = connection.execute(
            "SELECT base_id, display_name FROM base_metadata LIMIT 1"
        ).fetchone()

        if row is None:
            return "unknown", "unknown"

        return str(row[0]), str(row[1])

    @staticmethod
    def _to_record(path: Path, inspection: ArtifactInspection) -> ExportRecord:
        return ExportRecord(
            filename=path.name,
            path=str(path),
            size_bytes=path.stat().st_size,
            created_at=inspection.created_at,
            package_label=inspection.package_label,
            artifact_id=inspection.artifact_id,
            source_base_id=inspection.source_base_id,
            page_count=inspection.page_count,
            active_page_count=inspection.active_page_count,
            link_count=inspection.link_count,
            attachment_coverage_label=inspection.attachment_coverage_label,
            compatibility=inspection.compatibility,
            provenance_summary=inspection.provenance_summary,
        )

    @staticmethod
    def _unreadable(path: Path, error: str) -> ArtifactInspection:
        return ArtifactInspection(
            path=str(path),
            artifact_class="incompatible",
            compatibility="corrupt_or_unreadable",
            base_id=None,
            artifact_id=None,
            display_name=None,
            schema_version=None,
            artifact_schema_family=None,
            artifact_schema_version=None,
            created_at=None,
            package_label=None,
            page_count=0,
            active_page_count=None,
            link_count=0,
            source_base_id=None,
            provenance_summary=None,
            attachment_coverage_label=None,
            valid_actions=[],
            errors=[error],
            summary="Incompatible or unreadable file",
        )

    @staticmethod
    def _count(connection: sqlite3.Connection, statement: str) -> int:
        row = connection.execute(statement).fetchone()

        if row is None or row[0] is None:
            return 0

        return int(row[0])

    @staticmethod
    def _cell(row: tuple[object, ...] | None, index: int) -> str | None:
        if row is None or row[index] is None:
            return None

        return str(row[index])
