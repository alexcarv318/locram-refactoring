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


class RegistryEntryListResponse(BaseModel):
    items: list[RegistryEntryRecord]
    active_base: RegistryEntryRecord | None


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
