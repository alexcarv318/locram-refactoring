from abc import ABC, abstractmethod

from schemas.backups import BackupDeletedResponse, BackupRecord, RestoreResult


class IBackupService(ABC):
    """Backups: full-file SQLite snapshots next to the knowledge file.

    Create, list, rename, delete, and restore. Restore writes a pre_restore
    snapshot first and refuses a different base_id unless allowed.
    """

    @abstractmethod
    def create_backup(self, trigger: str) -> BackupRecord: ...

    @abstractmethod
    def list_backups(self) -> list[BackupRecord]: ...

    @abstractmethod
    def delete_backup(self, filename: str) -> BackupDeletedResponse: ...

    @abstractmethod
    def rename_backup(self, filename: str, new_filename: str) -> BackupRecord: ...

    @abstractmethod
    def restore_backup(
        self,
        filename: str | None,
        path: str | None,
        allow_base_replacement: bool,
    ) -> RestoreResult: ...
