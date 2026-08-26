from fastapi import APIRouter, Depends

from dependencies import get_backup_service, get_writable_working_base
from interfaces.services.backups import IBackupService
from schemas.backups import (
    BackupCreateRequest,
    BackupDeletedResponse,
    BackupListResponse,
    BackupRenameRequest,
    BackupResponse,
    BackupRestoreRequest,
    RestoreResponse,
)
from schemas.bases import WorkingBaseRecord

backups_router = APIRouter(prefix="/api/backups")


@backups_router.get("", response_model=BackupListResponse)
def list_backups(
    backup_service: IBackupService = Depends(get_backup_service),
) -> BackupListResponse:
    return BackupListResponse(items=backup_service.list_backups())


@backups_router.post("", response_model=BackupResponse, status_code=201)
def create_backup(
    payload: BackupCreateRequest,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    backup_service: IBackupService = Depends(get_backup_service),
) -> BackupResponse:
    return BackupResponse(item=backup_service.create_backup(payload.trigger))


@backups_router.post("/restore", response_model=RestoreResponse)
def restore_backup(
    payload: BackupRestoreRequest,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    backup_service: IBackupService = Depends(get_backup_service),
) -> RestoreResponse:
    return RestoreResponse(
        item=backup_service.restore_backup(
            filename=payload.filename,
            path=payload.path,
            allow_base_replacement=payload.allow_base_replacement,
        )
    )


@backups_router.put("/{filename}/rename", response_model=BackupResponse)
def rename_backup(
    filename: str,
    payload: BackupRenameRequest,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    backup_service: IBackupService = Depends(get_backup_service),
) -> BackupResponse:
    return BackupResponse(item=backup_service.rename_backup(filename, payload.filename))


@backups_router.delete("/{filename}", response_model=BackupDeletedResponse)
def delete_backup(
    filename: str,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    backup_service: IBackupService = Depends(get_backup_service),
) -> BackupDeletedResponse:
    return backup_service.delete_backup(filename)
