from pathlib import Path

from exceptions.exports import ExportEmptyError, ExportNotFoundError, ExportScopeError
from interfaces.repositories.exports import IExportRepository
from interfaces.repositories.pages import IPageRepository
from interfaces.services.exports import IExportService
from interfaces.services.smart_folders import ISmartFolderService
from schemas.exports import (
    ArtifactInspection,
    ExportDeletedResponse,
    ExportRecord,
    ExportResult,
    ExportScope,
)
from schemas.pages import PageStatus, PageSummary


class ExportService(IExportService):
    def __init__(
        self,
        export_repository: IExportRepository,
        page_repository: IPageRepository,
        smart_folder_service: ISmartFolderService,
    ) -> None:
        self._export_repository = export_repository
        self._page_repository = page_repository
        self._smart_folder_service = smart_folder_service

    def export_subgraph(self, scope: ExportScope) -> ExportResult:
        page_ids = self._resolve_scope(scope)

        if not page_ids:
            raise ExportEmptyError()

        output_path = None

        if scope.output_path is not None and scope.output_path.strip() != "":
            output_path = Path(scope.output_path)

        return self._export_repository.export_pages(
            page_ids=page_ids,
            package_label=scope.package_label,
            output_path=output_path,
        )

    def list_exports(self) -> list[ExportRecord]:
        return self._export_repository.list_exports()

    def delete_export(self, filename: str) -> ExportDeletedResponse:
        deleted = self._export_repository.delete(filename)

        if not deleted:
            raise ExportNotFoundError(filename)

        return ExportDeletedResponse(deleted=True, filename=filename)

    def delete_export_by_artifact_id(self, artifact_id: str) -> ExportDeletedResponse:
        for item in self._export_repository.list_exports():
            if item.artifact_id == artifact_id:
                return self.delete_export(item.filename)

        raise ExportNotFoundError(artifact_id)

    def rename_export(self, filename: str, new_filename: str) -> ExportRecord:
        return self._export_repository.rename(filename, new_filename)

    def inspect_artifact(self, path: str) -> ArtifactInspection:
        return self._export_repository.inspect(Path(path))

    def _resolve_scope(self, scope: ExportScope) -> list[str]:
        if scope.page_ids:
            return [
                page_id
                for page_id in scope.page_ids
                if self._page_repository.get(page_id) is not None
            ]

        if scope.filter is not None:
            return self._smart_folder_service.matching_page_ids(None, scope.filter)

        if scope.preset_id is not None:
            return self._smart_folder_service.matching_page_ids(scope.preset_id, None)

        if (
            scope.page_type is None
            and scope.subject is None
            and scope.tag is None
            and not scope.include_all
        ):
            raise ExportScopeError()

        return [
            summary.id
            for summary in self._page_repository.list_visible_pages()
            if self._matches_scope(summary, scope)
        ]

    @staticmethod
    def _matches_scope(summary: PageSummary, scope: ExportScope) -> bool:
        required_status = scope.status

        if required_status is None and not scope.include_all:
            required_status = PageStatus.ACTIVE.value

        if required_status is not None and summary.status.value != required_status:
            return False

        if scope.page_type is not None and summary.type.value != scope.page_type:
            return False

        if scope.subject is not None and scope.subject not in summary.subject:
            return False

        return scope.tag is None or scope.tag in summary.tags
