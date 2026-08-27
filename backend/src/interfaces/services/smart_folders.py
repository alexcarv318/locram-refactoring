from abc import ABC, abstractmethod

from schemas.smart_folders import (
    FilterPresetDeletedResponse,
    FilterPresetRecord,
    FilterState,
    NotesSummariesResponse,
    SmartFolderGraph,
)


class ISmartFolderService(ABC):
    """Smart folders: saved filter presets and built-in scopes.

    Match pages, count sidebar scopes, and preview seed-neighborhood graphs.
    """

    @abstractmethod
    def list_presets(self) -> list[FilterPresetRecord]: ...

    @abstractmethod
    def get_preset(self, preset_id: str) -> FilterPresetRecord: ...

    @abstractmethod
    def create_preset(self, name: str, filter_state: FilterState) -> FilterPresetRecord: ...

    @abstractmethod
    def update_preset(
        self,
        preset_id: str,
        name: str | None,
        filter_state: FilterState | None,
    ) -> FilterPresetRecord: ...

    @abstractmethod
    def delete_preset(self, preset_id: str) -> FilterPresetDeletedResponse: ...

    @abstractmethod
    def get_notes_summaries(self) -> NotesSummariesResponse: ...

    @abstractmethod
    def get_notes_graph(self, expand_hops: int) -> SmartFolderGraph: ...

    @abstractmethod
    def get_smart_folder_graph(
        self,
        preset_id: str | None,
        filter_state: FilterState | None,
        expand_hops: int,
    ) -> SmartFolderGraph: ...

    @abstractmethod
    def matching_page_ids(
        self,
        preset_id: str | None,
        filter_state: FilterState | None,
    ) -> list[str]: ...
