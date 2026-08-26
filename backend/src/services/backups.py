from pathlib import Path

from exceptions.backups import BackupNotFoundError, BackupRestoreError
from interfaces.repositories.backups import IBackupRepository
from interfaces.services.backups import IBackupService
from schemas.backups import BackupDeletedResponse, BackupRecord, RestoreResult


class BackupService(IBackupService):
    def __init__(self, backup_repository: IBackupRepository) -> None:
        self._backup_repository = backup_repository

    def create_backup(self, trigger: str) -> BackupRecord:
        return self._backup_repository.create(self._safe_trigger(trigger))

    def list_backups(self) -> list[BackupRecord]:
        return self._backup_repository.list_backups()

    def delete_backup(self, filename: str) -> BackupDeletedResponse:
        deleted = self._backup_repository.delete(filename)

        if not deleted:
            raise BackupNotFoundError(filename)

        return BackupDeletedResponse(deleted=True, filename=filename)

    def rename_backup(self, filename: str, new_filename: str) -> BackupRecord:
        return self._backup_repository.rename(filename, new_filename)

    def restore_backup(
        self,
        filename: str | None,
        path: str | None,
        allow_base_replacement: bool,
    ) -> RestoreResult:
        snapshot = self._snapshot(filename=filename, path=path)
        current_base_id = self._backup_repository.current_base_id()
        snapshot_base_id = self._backup_repository.read_base_id(snapshot)

        if (
            current_base_id is not None
            and snapshot_base_id is not None
            and current_base_id != snapshot_base_id
            and not allow_base_replacement
        ):
            raise BackupRestoreError(
                "Snapshot belongs to a different base_id. "
                "Retry with allow_base_replacement=true to replace the current base."
            )

        pre_restore = self._backup_repository.restore(snapshot)

        return RestoreResult(
            restored_from=snapshot.name,
            restored_from_path=str(snapshot),
            pre_restore_backup=pre_restore.filename,
        )

    def _snapshot(self, filename: str | None, path: str | None) -> Path:
        if path is not None and path.strip() != "":
            return Path(path).expanduser().resolve()

        if filename is None or filename.strip() == "":
            raise BackupRestoreError("Field 'filename' or 'path' is required")

        snapshot = self._backup_repository.snapshot_path(filename)

        if not snapshot.is_file():
            raise BackupNotFoundError(filename)

        return snapshot

    @staticmethod
    def _safe_trigger(trigger: str) -> str:
        cleaned = "".join(
            character
            for character in trigger.strip()
            if character.isalnum() or character in "-_"
        )

        if cleaned == "":
            return "manual"

        return cleaned
