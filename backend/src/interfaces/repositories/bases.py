from abc import ABC, abstractmethod

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
