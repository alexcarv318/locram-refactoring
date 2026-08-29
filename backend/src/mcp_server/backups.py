from dependencies import get_backup_repository
from interfaces.services.backups import IBackupService
from schemas.backups import BackupDeletedResponse, BackupRecord, RestoreResult
from services.backups import BackupService

from .protocol import MCPServerApp


def get_backup_service(base_ref: str | None = None, write: bool = False) -> IBackupService:
    return BackupService(
        backup_repository=get_backup_repository(base_ref=base_ref, write=write)
    )


def backup_list_backups(base_ref: str | None = None) -> list[BackupRecord]:
    return get_backup_service(base_ref=base_ref).list_backups()


def backup_create_backup(
    reason_label: str | None = None,
    base_ref: str | None = None,
) -> BackupRecord:
    trigger = "manual"

    if reason_label is not None and reason_label.strip() != "":
        trigger = reason_label.strip()

    return get_backup_service(base_ref=base_ref, write=True).create_backup(trigger)


def backup_delete_backup(
    backup_name: str,
    base_ref: str | None = None,
) -> BackupDeletedResponse:
    return get_backup_service(base_ref=base_ref, write=True).delete_backup(backup_name)


def backup_rename_backup(
    backup_name: str,
    new_backup_name: str,
    base_ref: str | None = None,
) -> BackupRecord:
    return get_backup_service(base_ref=base_ref, write=True).rename_backup(
        backup_name,
        new_backup_name,
    )


def backup_restore_backup(
    backup_name: str,
    allow_base_replacement: bool = False,
    base_ref: str | None = None,
) -> RestoreResult:
    return get_backup_service(base_ref=base_ref, write=True).restore_backup(
        filename=backup_name,
        path=None,
        allow_base_replacement=allow_base_replacement,
    )


def register(mcp: MCPServerApp) -> None:
    mcp.tool()(backup_list_backups)
    mcp.tool()(backup_create_backup)
    mcp.tool()(backup_delete_backup)
    mcp.tool()(backup_rename_backup)
    mcp.tool()(backup_restore_backup)
