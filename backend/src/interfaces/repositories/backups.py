from abc import ABC, abstractmethod
from pathlib import Path

from schemas.backups import BackupRecord


class IBackupRepository(ABC):
    @abstractmethod
    def create(self, trigger: str) -> BackupRecord: ...

    @abstractmethod
    def list_backups(self) -> list[BackupRecord]: ...

    @abstractmethod
    def get(self, filename: str) -> BackupRecord | None: ...

    @abstractmethod
    def delete(self, filename: str) -> bool: ...

    @abstractmethod
    def rename(self, filename: str, new_filename: str) -> BackupRecord: ...

    @abstractmethod
    def restore(self, snapshot_path: Path) -> BackupRecord: ...

    @abstractmethod
    def snapshot_path(self, filename: str) -> Path: ...

    @abstractmethod
    def current_base_id(self) -> str | None: ...

    @abstractmethod
    def read_base_id(self, snapshot_path: Path) -> str | None: ...
