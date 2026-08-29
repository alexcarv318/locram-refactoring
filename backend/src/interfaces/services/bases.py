from abc import ABC, abstractmethod

from schemas.bases import (
    AgentAccessMode,
    RegistryEntryRecord,
    WorkingBaseRecord,
)


class IBaseRegistryService(ABC):
    """Bases: local knowledge-file registry plus shared and managed working bases.

    Create, register, switch, rename, delete, access mode, and working-base
    selection. `managed:` snapshot bases and accepted `shared:` shares are
    selectable working bases.
    """

    @abstractmethod
    def list_bases(self) -> list[RegistryEntryRecord]: ...

    @abstractmethod
    def get_active(self) -> RegistryEntryRecord | None: ...

    @abstractmethod
    def get_entry(self, entry_id: str) -> RegistryEntryRecord: ...

    @abstractmethod
    def register(
        self,
        path: str,
        activate: bool,
        display_name: str | None,
    ) -> RegistryEntryRecord: ...

    @abstractmethod
    def create(self, path: str, display_name: str, activate: bool) -> RegistryEntryRecord: ...

    @abstractmethod
    def switch(self, entry_id: str) -> RegistryEntryRecord: ...

    @abstractmethod
    def unregister(self, entry_id: str) -> None: ...

    @abstractmethod
    def delete(self, entry_id: str, force: bool) -> None: ...

    @abstractmethod
    def rename(self, entry_id: str, display_name: str) -> RegistryEntryRecord: ...

    @abstractmethod
    def set_agent_access_mode(
        self,
        entry_id: str,
        agent_access_mode: AgentAccessMode,
    ) -> RegistryEntryRecord: ...

    @abstractmethod
    def list_working_bases(self) -> list[WorkingBaseRecord]: ...

    @abstractmethod
    def get_current_working_base(self) -> WorkingBaseRecord | None: ...

    @abstractmethod
    def select_working_base(self, base_ref: str) -> WorkingBaseRecord: ...

    @abstractmethod
    def get_working_base(self, base_ref: str | None, write: bool) -> WorkingBaseRecord: ...
