from abc import ABC, abstractmethod
from pathlib import Path

from schemas.exports import ArtifactInspection, ExportRecord, ExportResult


class IExportRepository(ABC):
    @abstractmethod
    def export_pages(
        self,
        page_ids: list[str],
        package_label: str | None,
        output_path: Path | None,
    ) -> ExportResult: ...

    @abstractmethod
    def list_exports(self) -> list[ExportRecord]: ...

    @abstractmethod
    def delete(self, filename: str) -> bool: ...

    @abstractmethod
    def rename(self, filename: str, new_filename: str) -> ExportRecord: ...

    @abstractmethod
    def inspect(self, path: Path) -> ArtifactInspection: ...
