from abc import ABC, abstractmethod

from schemas.changes import DataChange, DataVersion


class IChangeService(ABC):
    """Changes: desktop freshness for page and link writes.

    Version counter plus typed change events. Desktop polls GET /api/data-version
    and listens on GET /api/events.
    """

    @abstractmethod
    def get_data_version(self) -> DataVersion: ...

    @abstractmethod
    def list_changes(
        self,
        after_version: int,
        through_version: int,
        base_ref: str | None,
        entry_id: str | None,
    ) -> list[DataChange]: ...
