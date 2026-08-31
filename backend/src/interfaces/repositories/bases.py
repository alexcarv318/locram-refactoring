from abc import ABC, abstractmethod
from pathlib import Path

from models.bases import RegistryEntry


class IBaseRegistryRepository(ABC):
    @abstractmethod
    def get(self, entry_id: str) -> RegistryEntry | None: ...

    @abstractmethod
    def get_by_path(self, path: str) -> RegistryEntry | None: ...

    @abstractmethod
    def get_active(self) -> RegistryEntry | None: ...

    @abstractmethod
    def list_entries(self) -> list[RegistryEntry]: ...

    @abstractmethod
    def save(self, entry: RegistryEntry) -> RegistryEntry: ...

    @abstractmethod
    def delete(self, entry_id: str) -> None: ...

    @abstractmethod
    def set_active(self, entry_id: str) -> None: ...


class IManagedBaseRepository(ABC):
    @abstractmethod
    def stamp_schema_version(self, path: Path) -> None: ...

    @abstractmethod
    def install_pages_search_index(self, path: Path) -> None: ...

    @abstractmethod
    def read_base_id(self, path: Path) -> str | None: ...
