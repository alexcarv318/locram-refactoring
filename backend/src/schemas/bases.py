from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class AgentAccessMode(StrEnum):
    WRITE = "write"
    READ = "read"
    HIDDEN = "hidden"


class RegistryEntryRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    entry_id: str
    path: str
    base_id: str
    display_name: str
    is_active: bool
    agent_access_mode: AgentAccessMode
    created_at: str
    updated_at: str
    visible_in_mcp: bool


class BaseRegisterRequest(BaseModel):
    path: str
    activate: bool = False
    display_name: str | None = None


class BaseCreateRequest(BaseModel):
    path: str
    display_name: str
    activate: bool = False


class BaseRenameRequest(BaseModel):
    display_name: str


class BaseDeleteRequest(BaseModel):
    force: bool = False


class BaseReplaceActiveRequest(BaseModel):
    path: str


class BaseUnregisteredResponse(BaseModel):
    removed: bool
    entry_id: str


class BaseDeletedResponse(BaseModel):
    deleted: bool
    path: str


class AgentAccessModeUpdate(BaseModel):
    agent_access_mode: AgentAccessMode


class RegistryEntryResponse(BaseModel):
    item: RegistryEntryRecord


class ManagedBaseKind(StrEnum):
    GGL = "ggl"
    DOCUMENTATION = "documentation"


class ManagedBaseRefreshRequest(BaseModel):
    locale: str | None = None


class ManagedBaseSummaryRecord(BaseModel):
    kind: ManagedBaseKind
    label: str
    base_key: str
    base_ref: str
    content_kind: str
    read_only: bool
    visibility: str
    mounted_version: str | None
    updated_at: str
    path: str
    base_id: str | None
    source_url: str | None
    integrity_ref: str | None
    bootstrap_source: str | None
    locale: str | None
    available_locales: list[str]
    documentation_assets: None = None
    remote_manifest_url: str | None
    remote_artifact_url: str | None
    refresh_configured: bool
    stats: None = None


class ManagedBaseSummaryResponse(BaseModel):
    item: ManagedBaseSummaryRecord


class RegistryEntryListResponse(BaseModel):
    items: list[RegistryEntryRecord]
    active_base: RegistryEntryRecord | None
    built_in_bases: list[ManagedBaseSummaryRecord] = []


class WorkingBaseRecord(BaseModel):
    base_ref: str
    kind: str = "local"
    label: str
    is_current_working_base: bool
    is_local_active_base: bool
    is_selectable: bool
    agent_access_mode: AgentAccessMode
    entry_id: str
    path: str


class WorkingBaseListResponse(BaseModel):
    items: list[WorkingBaseRecord]


class WorkingBaseResponse(BaseModel):
    item: WorkingBaseRecord | None
