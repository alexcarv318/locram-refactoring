from abc import ABC, abstractmethod

from schemas.smart_folders import FilterPresetRecord, FilterState


class ISmartFolderRepository(ABC):
    @abstractmethod
    def list_presets(self) -> list[FilterPresetRecord]: ...

    @abstractmethod
    def get_preset(self, preset_id: str) -> FilterPresetRecord | None: ...

    @abstractmethod
    def create_preset(self, name: str, filter_state: FilterState) -> FilterPresetRecord: ...

    @abstractmethod
    def update_preset(
        self,
        preset_id: str,
        name: str | None,
        filter_state: FilterState | None,
    ) -> FilterPresetRecord | None: ...

    @abstractmethod
    def delete_preset(self, preset_id: str) -> bool: ...
