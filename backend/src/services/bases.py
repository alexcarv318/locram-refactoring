from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from ulid import ULID

import database
from database import open_knowledge_session
from exceptions.bases import (
    ActiveBaseError,
    BaseFileExistsError,
    BaseFileNotFoundError,
    BaseNotFoundError,
    WorkingBaseMutationTargetError,
    WorkingBaseNotFoundError,
    WorkingBaseReadOnlyError,
)
from interfaces.repositories.bases import IBaseRegistryRepository
from interfaces.services.bases import IBaseRegistryService
from models.bases import BaseMetadata, RegistryEntry
from schemas.bases import AgentAccessMode, RegistryEntryRecord, WorkingBaseRecord

selected_working_entry_id: str | None = None


class BaseRegistryService(IBaseRegistryService):
    def __init__(self, base_registry_repository: IBaseRegistryRepository) -> None:
        self._base_registry_repository = base_registry_repository

    def list_bases(self) -> list[RegistryEntryRecord]:
        self._ensure_default()
        return [self._to_record(entry) for entry in self._base_registry_repository.list_entries()]

    def get_active(self) -> RegistryEntryRecord | None:
        self._ensure_default()
        entry = self._base_registry_repository.get_active()

        if entry is None:
            return None

        return self._to_record(entry)

    def get_entry(self, entry_id: str) -> RegistryEntryRecord:
        return self._to_record(self._require_entry(entry_id))

    def register(
        self,
        path: str,
        activate: bool,
        display_name: str | None,
    ) -> RegistryEntryRecord:
        resolved = Path(path).expanduser().resolve()

        if not resolved.is_file():
            raise BaseFileNotFoundError(str(resolved))

        metadata = self._read_or_create_metadata(resolved, display_name or resolved.stem)
        existing = self._base_registry_repository.get_by_path(str(resolved))

        if existing is not None:
            existing.base_id = metadata.base_id
            existing.display_name = metadata.display_name
            existing.updated_at = self._now()
            saved = self._base_registry_repository.save(existing)

            if activate:
                return self.switch(saved.entry_id)

            return self._to_record(saved)

        entry = self._new_entry(str(resolved), metadata.base_id, metadata.display_name)
        saved = self._base_registry_repository.save(entry)

        if activate:
            return self.switch(saved.entry_id)

        return self._to_record(saved)

    def create(self, path: str, display_name: str, activate: bool) -> RegistryEntryRecord:
        resolved = Path(path).expanduser().resolve()

        if resolved.exists():
            raise BaseFileExistsError(str(resolved))

        metadata = self._read_or_create_metadata(resolved, display_name)
        entry = self._new_entry(str(resolved), metadata.base_id, metadata.display_name)
        saved = self._base_registry_repository.save(entry)

        if activate:
            return self.switch(saved.entry_id)

        return self._to_record(saved)

    def switch(self, entry_id: str) -> RegistryEntryRecord:
        entry = self._require_entry(entry_id)

        if not Path(entry.path).is_file():
            raise BaseFileNotFoundError(entry.path)

        self._read_or_create_metadata(Path(entry.path), entry.display_name)
        self._base_registry_repository.set_active(entry_id)
        database.knowledge_engines.clear()
        return self._to_record(self._require_entry(entry_id))

    def unregister(self, entry_id: str) -> None:
        entry = self._require_entry(entry_id)

        if entry.is_active:
            raise ActiveBaseError(entry_id)

        if selected_working_entry_id == entry_id:
            self.select_working_base_id(None)

        self._base_registry_repository.delete(entry_id)

    def delete(self, entry_id: str, force: bool) -> None:
        entry = self._require_entry(entry_id)

        if entry.is_active and not force:
            raise ActiveBaseError(entry_id)

        replacement: RegistryEntry | None = None

        if entry.is_active and force:
            replacement = self._first_other_entry(entry_id)

            if replacement is not None:
                self.switch(replacement.entry_id)

        if selected_working_entry_id == entry_id:
            self.select_working_base_id(None)

        path = Path(entry.path)
        self._base_registry_repository.delete(entry_id)

        if path.is_file():
            path.unlink()

        if entry.is_active and force and replacement is None:
            database.knowledge_engines.clear()

    def rename(self, entry_id: str, display_name: str) -> RegistryEntryRecord:
        entry = self._require_entry(entry_id)
        self._write_display_name(Path(entry.path), display_name)
        entry.display_name = display_name
        entry.updated_at = self._now()
        return self._to_record(self._base_registry_repository.save(entry))

    def set_agent_access_mode(
        self,
        entry_id: str,
        agent_access_mode: AgentAccessMode,
    ) -> RegistryEntryRecord:
        entry = self._require_entry(entry_id)
        entry.agent_access_mode = agent_access_mode
        entry.updated_at = self._now()
        return self._to_record(self._base_registry_repository.save(entry))

    def list_working_bases(self) -> list[WorkingBaseRecord]:
        return [
            self._to_working_base(entry)
            for entry in self.list_bases()
            if entry.agent_access_mode is not AgentAccessMode.HIDDEN
        ]

    def get_current_working_base(self) -> WorkingBaseRecord | None:
        if selected_working_entry_id is not None:
            entry = self._base_registry_repository.get(selected_working_entry_id)

            if entry is not None and entry.agent_access_mode is not AgentAccessMode.HIDDEN:
                return self._to_working_base(self._to_record(entry))

        active = self.get_active()

        if active is None or active.agent_access_mode is AgentAccessMode.HIDDEN:
            return None

        return self._to_working_base(active)

    def select_working_base(self, base_ref: str) -> WorkingBaseRecord:
        entry = self._require_entry(self._entry_id_from_base_ref(base_ref))

        if entry.agent_access_mode is AgentAccessMode.HIDDEN:
            raise WorkingBaseNotFoundError(base_ref)

        self.select_working_base_id(entry.entry_id)
        return self._to_working_base(self._to_record(entry))

    def get_working_base(self, base_ref: str | None, write: bool) -> WorkingBaseRecord:
        self._ensure_default()

        if base_ref is not None:
            return self._to_working_base(self._to_record(self._visible_entry(base_ref, write)))

        if write:
            writable = [
                entry
                for entry in self._base_registry_repository.list_entries()
                if entry.agent_access_mode is AgentAccessMode.WRITE
            ]

            if len(writable) > 1:
                raise WorkingBaseMutationTargetError()

        if selected_working_entry_id is not None:
            working = self._base_registry_repository.get(selected_working_entry_id)

            if working is not None and working.agent_access_mode is not AgentAccessMode.HIDDEN:
                return self._to_working_base(
                    self._to_record(self._writable_if_needed(working, write))
                )

        active = self._base_registry_repository.get_active()

        if active is not None and active.agent_access_mode is not AgentAccessMode.HIDDEN:
            return self._to_working_base(self._to_record(self._writable_if_needed(active, write)))

        raise WorkingBaseNotFoundError(base_ref or "local:")

    def _visible_entry(self, base_ref: str, write: bool) -> RegistryEntry:
        entry = self._require_entry(self._entry_id_from_base_ref(base_ref))

        if entry.agent_access_mode is AgentAccessMode.HIDDEN:
            raise WorkingBaseNotFoundError(base_ref)

        return self._writable_if_needed(entry, write)

    @staticmethod
    def _writable_if_needed(entry: RegistryEntry, write: bool) -> RegistryEntry:
        if write and entry.agent_access_mode is AgentAccessMode.READ:
            raise WorkingBaseReadOnlyError(f"local:{entry.entry_id}")

        return entry

    @staticmethod
    def select_working_base_id(entry_id: str | None) -> None:
        global selected_working_entry_id

        selected_working_entry_id = entry_id
        database.knowledge_engines.clear()

    def _ensure_default(self) -> None:
        if self._base_registry_repository.list_entries():
            return

        metadata = self._read_or_create_metadata(database.knowledge_path, "locram")
        entry = self._new_entry(
            str(database.knowledge_path.expanduser().resolve()),
            metadata.base_id,
            metadata.display_name,
        )
        saved = self._base_registry_repository.save(entry)
        self._base_registry_repository.set_active(saved.entry_id)

    def _require_entry(self, entry_id: str) -> RegistryEntry:
        entry = self._base_registry_repository.get(entry_id)

        if entry is None:
            raise BaseNotFoundError(entry_id)

        return entry

    def _first_other_entry(self, entry_id: str) -> RegistryEntry | None:
        for entry in self._base_registry_repository.list_entries():
            if entry.entry_id != entry_id:
                return entry

        return None

    def _new_entry(self, path: str, base_id: str, display_name: str) -> RegistryEntry:
        now = self._now()
        return RegistryEntry(
            entry_id=str(ULID()),
            path=path,
            base_id=base_id,
            display_name=display_name,
            is_active=False,
            agent_access_mode=AgentAccessMode.WRITE,
            created_at=now,
            updated_at=now,
        )

    @staticmethod
    def _read_or_create_metadata(path: Path, display_name: str) -> BaseMetadata:
        session = open_knowledge_session(path)

        try:
            metadata = session.scalars(select(BaseMetadata)).first()

            if metadata is None:
                metadata = BaseMetadata(base_id=str(ULID()), display_name=display_name)
                session.add(metadata)
                session.commit()
                session.refresh(metadata)

            return metadata
        finally:
            session.close()

    @staticmethod
    def _write_display_name(path: Path, display_name: str) -> None:
        session = open_knowledge_session(path)

        try:
            metadata = session.scalars(select(BaseMetadata)).first()

            if metadata is None:
                session.add(BaseMetadata(base_id=str(ULID()), display_name=display_name))
            else:
                metadata.display_name = display_name

            session.commit()
        finally:
            session.close()

    @staticmethod
    def _to_record(entry: RegistryEntry) -> RegistryEntryRecord:
        return RegistryEntryRecord(
            entry_id=entry.entry_id,
            path=entry.path,
            base_id=entry.base_id,
            display_name=entry.display_name,
            is_active=entry.is_active,
            agent_access_mode=entry.agent_access_mode,
            created_at=entry.created_at,
            updated_at=entry.updated_at,
            visible_in_mcp=entry.agent_access_mode is not AgentAccessMode.HIDDEN,
        )

    @staticmethod
    def _to_working_base(entry: RegistryEntryRecord) -> WorkingBaseRecord:
        is_selected = selected_working_entry_id == entry.entry_id
        is_fallback = selected_working_entry_id is None and entry.is_active
        return WorkingBaseRecord(
            base_ref=f"local:{entry.entry_id}",
            label=entry.display_name,
            is_current_working_base=is_selected or is_fallback,
            is_local_active_base=entry.is_active,
            is_selectable=entry.agent_access_mode is not AgentAccessMode.HIDDEN,
            agent_access_mode=entry.agent_access_mode,
            entry_id=entry.entry_id,
            path=entry.path,
        )

    @staticmethod
    def _entry_id_from_base_ref(base_ref: str) -> str:
        prefix = "local:"

        if not base_ref.startswith(prefix):
            raise WorkingBaseNotFoundError(base_ref)

        entry_id = base_ref.removeprefix(prefix)

        if entry_id == "":
            raise WorkingBaseNotFoundError(base_ref)

        return entry_id

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
