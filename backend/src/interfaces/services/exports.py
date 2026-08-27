from abc import ABC, abstractmethod

from schemas.exports import (
    ArtifactInspection,
    ExportDeletedResponse,
    ExportRecord,
    ExportResult,
    ExportScope,
)


class IExportService(ABC):
    """Exports: scoped SQLite transfer artifacts next to the knowledge file.

    Write a page-and-link slice, list or rename or delete those files, and
    inspect any locram SQLite path before merge or register.
    """

    @abstractmethod
    def export_subgraph(self, scope: ExportScope) -> ExportResult: ...

    @abstractmethod
    def list_exports(self) -> list[ExportRecord]: ...

    @abstractmethod
    def delete_export(self, filename: str) -> ExportDeletedResponse: ...

    @abstractmethod
    def delete_export_by_artifact_id(self, artifact_id: str) -> ExportDeletedResponse: ...

    @abstractmethod
    def rename_export(self, filename: str, new_filename: str) -> ExportRecord: ...

    @abstractmethod
    def inspect_artifact(self, path: str) -> ArtifactInspection: ...
