import json
import sqlite3
from pathlib import Path

from sqlalchemy import select

from database import BaseRepository
from exceptions.merges import MergeSourceError
from interfaces.repositories.merges import IMergeRepository
from models.bases import BaseMetadata
from schemas.merges import MergeLink, MergePage, MergeSource


class MergeRepository(BaseRepository, IMergeRepository):
    def read_source(self, path: Path) -> MergeSource:
        resolved = path.expanduser().resolve()

        if not resolved.is_file():
            raise MergeSourceError(f"Source not found: {resolved}")

        connection = sqlite3.connect(f"file:{resolved}?mode=ro", uri=True)

        try:
            tables = {
                str(row[0])
                for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
            }

            if "pages" not in tables or "links" not in tables:
                raise MergeSourceError("Source is missing pages or links")

            artifact_id = None
            source_base_id = None

            if "artifact_metadata" in tables:
                artifact = connection.execute(
                    """
                    SELECT artifact_id, source_base_id
                    FROM artifact_metadata
                    LIMIT 1
                    """
                ).fetchone()

                if artifact is not None:
                    artifact_id = str(artifact[0]) if artifact[0] is not None else None
                    source_base_id = str(artifact[1]) if artifact[1] is not None else None

            pages: list[MergePage] = []

            for row in connection.execute(
                """
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
                """
            ):
                page_id = str(row[0])

                if page_id.startswith("_export_manifest_"):
                    continue

                pages.append(
                    MergePage(
                        id=page_id,
                        title=str(row[1]),
                        content=str(row[2]),
                        type=str(row[3]),
                        status=str(row[4]),
                        subject=self._parse_json_list(row[5]),
                        tags=self._parse_json_list(row[6]),
                        parent_id=str(row[7]) if row[7] is not None else None,
                        content_hash=str(row[8]) if row[8] is not None else None,
                        review_interval_days=int(row[9]) if row[9] is not None else 7,
                        created_at=str(row[10]) if row[10] is not None else "",
                        updated_at=str(row[11]) if row[11] is not None else "",
                        reviewed_at=str(row[12]) if row[12] is not None else None,
                    )
                )

            links = [
                MergeLink(
                    source_id=str(row[0]),
                    target_id=str(row[1]),
                    link_type=str(row[2]),
                    created_at=str(row[3]) if row[3] is not None else "",
                )
                for row in connection.execute(
                    "SELECT source_id, target_id, link_type, created_at FROM links"
                )
            ]
        except sqlite3.Error as error:
            raise MergeSourceError(f"Cannot read as SQLite: {error}") from error
        finally:
            connection.close()

        return MergeSource(
            path=str(resolved),
            artifact_id=artifact_id,
            source_base_id=source_base_id,
            pages=pages,
            links=links,
        )

    def get_target_base(self) -> tuple[str, str]:
        metadata = self.db.scalars(select(BaseMetadata)).first()

        if metadata is None:
            raise MergeSourceError("No base_metadata found in the current target base")

        return metadata.base_id, metadata.display_name

    @staticmethod
    def _parse_json_list(value: object) -> list[str]:
        if value is None:
            return []

        parsed = json.loads(str(value))

        return [str(item) for item in parsed]
