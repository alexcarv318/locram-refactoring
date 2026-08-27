from fastapi import APIRouter, Depends

from dependencies import get_export_service, get_writable_working_base
from interfaces.services.exports import IExportService
from schemas.bases import WorkingBaseRecord
from schemas.exports import (
    ArtifactInspectRequest,
    ArtifactInspectResponse,
    ExportDeletedResponse,
    ExportListResponse,
    ExportRecordResponse,
    ExportRenameRequest,
    ExportResponse,
    ExportScope,
)

exports_router = APIRouter()


@exports_router.get("/api/exports", response_model=ExportListResponse)
def list_exports(
    export_service: IExportService = Depends(get_export_service),
) -> ExportListResponse:
    return ExportListResponse(items=export_service.list_exports())


@exports_router.post("/api/export", response_model=ExportResponse, status_code=201)
def export_subgraph(
    payload: ExportScope,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    export_service: IExportService = Depends(get_export_service),
) -> ExportResponse:
    return ExportResponse(item=export_service.export_subgraph(payload))


@exports_router.put("/api/exports/{filename}/rename", response_model=ExportRecordResponse)
def rename_export(
    filename: str,
    payload: ExportRenameRequest,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    export_service: IExportService = Depends(get_export_service),
) -> ExportRecordResponse:
    return ExportRecordResponse(item=export_service.rename_export(filename, payload.filename))


@exports_router.delete("/api/exports/{filename}", response_model=ExportDeletedResponse)
def delete_export(
    filename: str,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    export_service: IExportService = Depends(get_export_service),
) -> ExportDeletedResponse:
    return export_service.delete_export(filename)


@exports_router.post("/api/artifacts/inspect", response_model=ArtifactInspectResponse)
def inspect_artifact(
    payload: ArtifactInspectRequest,
    export_service: IExportService = Depends(get_export_service),
) -> ArtifactInspectResponse:
    return ArtifactInspectResponse(item=export_service.inspect_artifact(payload.path))
