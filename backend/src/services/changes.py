from interfaces.repositories.changes import IChangeRepository
from interfaces.services.changes import IChangeService
from models.changes import ChangeEvent
from schemas.changes import (
    DataChange,
    DataVersion,
    LinkDataChange,
    PageChangeKind,
    PageDataChange,
)


class ChangeService(IChangeService):
    _PAGE_KIND_PREFIXES = (
        "metadata:",
        "content:",
        "topology:",
    )

    def __init__(self, change_repository: IChangeRepository) -> None:
        self._change_repository = change_repository

    def get_data_version(self) -> DataVersion:
        version = self._change_repository.get_version()

        return DataVersion(version=version.version, updated_at=version.updated_at)

    def list_changes(
        self,
        after_version: int,
        through_version: int,
        base_ref: str | None,
        entry_id: str | None,
    ) -> list[DataChange]:
        return [
            self._to_change(event, base_ref, entry_id)
            for event in self._change_repository.list_events(after_version, through_version)
        ]

    def _to_change(
        self,
        event: ChangeEvent,
        base_ref: str | None,
        entry_id: str | None,
    ) -> DataChange:
        if event.entity_kind == "link":
            return self._to_link_change(event, base_ref, entry_id)

        return self._to_page_change(event, base_ref, entry_id)

    def _to_page_change(
        self,
        event: ChangeEvent,
        base_ref: str | None,
        entry_id: str | None,
    ) -> PageDataChange:
        change_kind: PageChangeKind | None = None
        page_id = event.entity_id

        for prefix in self._PAGE_KIND_PREFIXES:
            if event.entity_id.startswith(prefix):
                change_kind = PageChangeKind(prefix.removesuffix(":"))
                page_id = event.entity_id[len(prefix) :]
                break

        return PageDataChange(
            version=event.version,
            operation=event.operation,
            occurred_at=event.occurred_at,
            page_id=page_id,
            change_kind=change_kind,
            base_ref=base_ref,
            entry_id=entry_id,
        )

    @staticmethod
    def _to_link_change(
        event: ChangeEvent,
        base_ref: str | None,
        entry_id: str | None,
    ) -> LinkDataChange:
        parts = event.entity_id.split(":", 2)

        if len(parts) == 3:
            return LinkDataChange(
                version=event.version,
                operation=event.operation,
                occurred_at=event.occurred_at,
                source_id=parts[0],
                target_id=parts[1],
                link_type=parts[2],
                base_ref=base_ref,
                entry_id=entry_id,
            )

        return LinkDataChange(
            version=event.version,
            operation=event.operation,
            occurred_at=event.occurred_at,
            entity_id=event.entity_id,
            base_ref=base_ref,
            entry_id=entry_id,
        )
