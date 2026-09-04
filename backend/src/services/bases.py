import shutil
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
    ManagedBaseKindError,
    ManagedBaseLocaleError,
    ManagedBaseSeedError,
    WorkingBaseMutationTargetError,
    WorkingBaseNotFoundError,
    WorkingBaseReadOnlyError,
)
from interfaces.repositories.bases import IBaseRegistryRepository, IManagedBaseRepository
from interfaces.services.access import IAccessService
from interfaces.services.bases import IBaseRegistryService
from models.bases import BaseMetadata, RegistryEntry
from repositories.backups import BackupRepository
from schemas.access import DesktopCapability
from schemas.backups import KnowledgeFileStats
from schemas.bases import (
    AgentAccessMode,
    ManagedBaseKind,
    ManagedBaseSummaryRecord,
    RegistryEntryRecord,
    WorkingBaseRecord,
)
from schemas.sharing import ShareGrantPermission

selected_working_base_ref: str | None = None

MANAGED_BASE_LABELS = {
    ManagedBaseKind.GGL: "GGL",
    ManagedBaseKind.DOCUMENTATION: "Documentation",
}


class BaseRegistryService(IBaseRegistryService):
    def __init__(
        self,
        base_registry_repository: IBaseRegistryRepository,
        managed_base_repository: IManagedBaseRepository,
        access_service: IAccessService | None = None,
    ) -> None:
        self._base_registry_repository = base_registry_repository
        self._managed_base_repository = managed_base_repository
        self._access_service = access_service

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
        return self._persist_local_path(path, activate, display_name, replacing_active=False)

    def create(self, path: str, display_name: str, activate: bool) -> RegistryEntryRecord:
        if self._base_registry_repository.list_entries():
            self._deny_without_capability(DesktopCapability.MULTI_BASE)

        resolved = Path(path).expanduser().resolve()

        if resolved.exists():
            raise BaseFileExistsError(str(resolved))

        metadata = self._read_or_create_metadata(resolved, display_name)
        entry = self._new_entry(str(resolved), metadata.base_id, metadata.display_name)
        saved = self._base_registry_repository.save(entry)

        if activate:
            return self._set_active(saved.entry_id)

        return self._to_record(saved)

    def switch(self, entry_id: str) -> RegistryEntryRecord:
        entry = self._require_entry(entry_id)

        if not entry.is_active:
            self._deny_without_capability(DesktopCapability.MULTI_BASE)

        return self._set_active(entry_id)

    def replace_active(self, path: str) -> RegistryEntryRecord:
        previous = self.get_active()
        activated = self._persist_local_path(path, True, None, replacing_active=True)

        if previous is not None and previous.entry_id != activated.entry_id:
            self.unregister(previous.entry_id)

        return activated

    def unregister(self, entry_id: str) -> None:
        entry = self._require_entry(entry_id)

        if entry.is_active:
            raise ActiveBaseError(entry_id)

        if selected_working_base_ref == f"local:{entry_id}":
            self.select_working_base_ref(None)

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

        if selected_working_base_ref == f"local:{entry_id}":
            self.select_working_base_ref(None)

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
        self._deny_without_capability(DesktopCapability.AGENT_BASE_ADMINISTRATION)
        entry = self._require_entry(entry_id)
        entry.agent_access_mode = agent_access_mode
        entry.updated_at = self._now()
        return self._to_record(self._base_registry_repository.save(entry))

    def list_managed_bases(self) -> list[ManagedBaseSummaryRecord]:
        return [self._managed_base_summary(kind) for kind in ManagedBaseKind]

    def refresh_managed_base(
        self,
        kind: str,
        locale: str | None = None,
    ) -> ManagedBaseSummaryRecord:
        managed_kind = self._managed_kind(kind)

        self._deny_without_capability(DesktopCapability.DOCS_GGL_UPDATES)

        if locale is not None and managed_kind is ManagedBaseKind.GGL:
            raise ManagedBaseLocaleError(kind)

        self._copy_managed_seed(managed_kind, overwrite=True)
        database.knowledge_engines.clear()
        return self._managed_base_summary(managed_kind)

    def list_working_bases(self) -> list[WorkingBaseRecord]:
        items = [
            self._to_working_base(entry)
            for entry in self.list_bases()
            if entry.agent_access_mode is not AgentAccessMode.HIDDEN
        ]
        items.extend(self._managed_working_bases())
        items.extend(self._shared_working_bases())
        return items

    def get_current_working_base(self) -> WorkingBaseRecord | None:
        if selected_working_base_ref is not None:
            return self.get_working_base(selected_working_base_ref, write=False)

        active = self.get_active()

        if active is None or active.agent_access_mode is AgentAccessMode.HIDDEN:
            return None

        return self._to_working_base(active)

    def select_working_base(self, base_ref: str) -> WorkingBaseRecord:
        working = self.get_working_base(base_ref, write=False)
        self.select_working_base_ref(working.base_ref)
        return self.get_working_base(working.base_ref, write=False)

    def get_working_base(self, base_ref: str | None, write: bool) -> WorkingBaseRecord:
        self._ensure_default()

        if base_ref is not None:
            return self._resolve_base_ref(base_ref, write)

        if write:
            writable = [
                entry
                for entry in self._base_registry_repository.list_entries()
                if entry.agent_access_mode is AgentAccessMode.WRITE
            ]

            if len(writable) > 1:
                raise WorkingBaseMutationTargetError()

        if selected_working_base_ref is not None:
            return self._resolve_base_ref(selected_working_base_ref, write)

        active = self._base_registry_repository.get_active()

        if active is not None and active.agent_access_mode is not AgentAccessMode.HIDDEN:
            return self._to_working_base(self._to_record(self._writable_if_needed(active, write)))

        raise WorkingBaseNotFoundError(base_ref or "local:")

    def _resolve_base_ref(self, base_ref: str, write: bool) -> WorkingBaseRecord:
        if base_ref.startswith("managed:"):
            return self._managed_working_base(base_ref, write)

        if base_ref.startswith("shared:"):
            return self._shared_working_base(base_ref, write)

        return self._to_working_base(self._to_record(self._visible_entry(base_ref, write)))

    def _visible_entry(self, base_ref: str, write: bool) -> RegistryEntry:
        entry = self._require_entry(self._entry_id_from_base_ref(base_ref))

        if entry.agent_access_mode is AgentAccessMode.HIDDEN:
            raise WorkingBaseNotFoundError(base_ref)

        if not entry.is_active:
            self._deny_without_capability(DesktopCapability.MULTI_BASE)

        return self._writable_if_needed(entry, write)

    @staticmethod
    def _writable_if_needed(entry: RegistryEntry, write: bool) -> RegistryEntry:
        if write and entry.agent_access_mode is AgentAccessMode.READ:
            raise WorkingBaseReadOnlyError(f"local:{entry.entry_id}")

        return entry

    @staticmethod
    def select_working_base_ref(base_ref: str | None) -> None:
        global selected_working_base_ref

        selected_working_base_ref = base_ref
        database.knowledge_engines.clear()

    def _managed_working_bases(self) -> list[WorkingBaseRecord]:
        return [
            self._managed_working_base(f"managed:{kind.value}", write=False)
            for kind in ManagedBaseKind
        ]

    def _managed_working_base(self, base_ref: str, write: bool) -> WorkingBaseRecord:
        kind = base_ref.removeprefix("managed:")
        managed_kind = None

        for candidate in ManagedBaseKind:
            if candidate.value == kind:
                managed_kind = candidate
                break

        if managed_kind is None:
            raise WorkingBaseNotFoundError(base_ref)

        if write:
            raise WorkingBaseReadOnlyError(base_ref)

        snapshot = self._ensure_managed_snapshot(managed_kind)
        return WorkingBaseRecord(
            base_ref=base_ref,
            kind="managed",
            label=MANAGED_BASE_LABELS[managed_kind],
            is_current_working_base=selected_working_base_ref == base_ref,
            is_local_active_base=False,
            is_selectable=True,
            agent_access_mode=AgentAccessMode.READ,
            entry_id=managed_kind.value,
            path=str(snapshot),
        )

    def _managed_base_summary(self, kind: ManagedBaseKind) -> ManagedBaseSummaryRecord:
        snapshot = self._ensure_managed_snapshot(kind)
        updated_at = datetime.fromtimestamp(snapshot.stat().st_mtime, UTC).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        return ManagedBaseSummaryRecord(
            kind=kind,
            label=MANAGED_BASE_LABELS[kind],
            base_key=kind.value,
            base_ref=f"managed:{kind.value}",
            content_kind="managed_sqlite",
            read_only=True,
            visibility="network_read",
            mounted_version=None,
            updated_at=updated_at,
            path=str(snapshot.resolve()),
            base_id=self._managed_base_repository.read_base_id(snapshot),
            source_url=None,
            integrity_ref=None,
            bootstrap_source="packaged_seed",
            locale=None,
            available_locales=[],
            remote_manifest_url=None,
            remote_artifact_url=None,
            refresh_configured=True,
            stats=self._stats_for_path(str(snapshot.resolve())),
        )

    def _ensure_managed_snapshot(self, kind: ManagedBaseKind) -> Path:
        return self._copy_managed_seed(kind, overwrite=False)

    def _copy_managed_seed(self, kind: ManagedBaseKind, overwrite: bool) -> Path:
        destination = database.managed_bases_path / f"{kind.value}.db"
        source = database.managed_base_seeds_path / f"{kind.value}.db"

        if not source.is_file():
            raise ManagedBaseSeedError(kind.value)

        if destination.is_file() and not overwrite:
            return destination

        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        self._managed_base_repository.stamp_schema_version(destination)
        self._managed_base_repository.install_pages_search_index(destination)
        return destination

    @staticmethod
    def _managed_kind(kind: str) -> ManagedBaseKind:
        for managed_kind in ManagedBaseKind:
            if managed_kind.value == kind:
                return managed_kind

        raise ManagedBaseKindError(kind)

    def _shared_working_bases(self) -> list[WorkingBaseRecord]:
        if self._access_service is None:
            return []

        if not self._access_service.has_capability(DesktopCapability.SHARE_BASE):
            return []

        now = datetime.now(UTC)
        items: list[WorkingBaseRecord] = []

        for share in self._access_service.list_accepted_shares():
            if share.is_available(now):
                items.append(self._shared_working_base(f"shared:{share.grant_id}", write=False))

        return items

    def _shared_working_base(self, base_ref: str, write: bool) -> WorkingBaseRecord:
        if self._access_service is None:
            raise WorkingBaseNotFoundError(base_ref)

        self._access_service.deny_without_capability(DesktopCapability.SHARE_BASE)
        grant_id = base_ref.removeprefix("shared:")
        share = self._access_service.get_accepted_share(grant_id)

        if share is None or grant_id == "" or not share.is_available(datetime.now(UTC)):
            raise WorkingBaseNotFoundError(base_ref)

        if write and share.permission is ShareGrantPermission.READ:
            raise WorkingBaseReadOnlyError(base_ref)

        agent_access_mode = AgentAccessMode.READ

        if share.permission is not ShareGrantPermission.READ:
            agent_access_mode = AgentAccessMode.WRITE

        return WorkingBaseRecord(
            base_ref=base_ref,
            kind="shared",
            label=share.share_base_title,
            is_current_working_base=selected_working_base_ref == base_ref,
            is_local_active_base=False,
            is_selectable=True,
            agent_access_mode=agent_access_mode,
            entry_id=share.grant_id,
            path="",
        )

    def _persist_local_path(
        self,
        path: str,
        activate: bool,
        display_name: str | None,
        replacing_active: bool,
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
                if not replacing_active and not existing.is_active:
                    self._deny_without_capability(DesktopCapability.MULTI_BASE)

                return self._set_active(saved.entry_id)

            return self._to_record(saved)

        if not replacing_active and self._base_registry_repository.list_entries():
            self._deny_without_capability(DesktopCapability.MULTI_BASE)

        entry = self._new_entry(str(resolved), metadata.base_id, metadata.display_name)
        saved = self._base_registry_repository.save(entry)

        if activate:
            return self._set_active(saved.entry_id)

        return self._to_record(saved)

    def _set_active(self, entry_id: str) -> RegistryEntryRecord:
        entry = self._require_entry(entry_id)

        if not Path(entry.path).is_file():
            raise BaseFileNotFoundError(entry.path)

        self._read_or_create_metadata(Path(entry.path), entry.display_name)
        self._base_registry_repository.set_active(entry_id)
        database.knowledge_engines.clear()
        return self._to_record(self._require_entry(entry_id))

    def _deny_without_capability(self, capability: DesktopCapability) -> None:
        if self._access_service is None:
            return

        self._access_service.deny_without_capability(capability)

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

    def _to_record(self, entry: RegistryEntry) -> RegistryEntryRecord:
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
            registered_at=entry.created_at,
            last_opened_at=entry.updated_at,
            last_open_succeeded_at=entry.updated_at,
            stats=self._stats_for_path(entry.path),
        )

    @staticmethod
    def _stats_for_path(path: str) -> KnowledgeFileStats | None:
        resolved = Path(path)

        if not resolved.is_file():
            return None

        return BackupRepository(source_path=resolved).read_stats(resolved)

    @staticmethod
    def _to_working_base(entry: RegistryEntryRecord) -> WorkingBaseRecord:
        is_selected = selected_working_base_ref == f"local:{entry.entry_id}"
        is_fallback = selected_working_base_ref is None and entry.is_active
        return WorkingBaseRecord(
            base_ref=f"local:{entry.entry_id}",
            kind="local",
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
