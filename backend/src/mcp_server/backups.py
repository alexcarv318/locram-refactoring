from dependencies import (
    get_access_http_client,
    get_access_relay,
    get_access_repository,
    get_access_service,
    get_access_settings,
    get_backup_repository,
)
from interfaces.services.backups import IBackupService
from schemas.access import DesktopCapability
from schemas.backups import BackupDeletedResponse, BackupListResponse, BackupRecord, RestoreResult
from services.backups import BackupService

from .protocol import MCPServerApp, register_tools


def get_backup_service(base_ref: str | None = None, write: bool = False) -> IBackupService:
    get_access_service(
        access_repository=get_access_repository(),
        access_relay=get_access_relay(),
        http_client=get_access_http_client(),
        settings=get_access_settings(),
    ).deny_without_capability(DesktopCapability.MULTI_BASE)

    return BackupService(
        backup_repository=get_backup_repository(base_ref=base_ref, write=write)
    )


def backup_list_backups(base_ref: str | None = None) -> BackupListResponse:
    return BackupListResponse(items=get_backup_service(base_ref=base_ref).list_backups())


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
    register_tools(
        mcp,
        backup_list_backups,
        backup_create_backup,
        backup_delete_backup,
        backup_rename_backup,
        backup_restore_backup,
    )
