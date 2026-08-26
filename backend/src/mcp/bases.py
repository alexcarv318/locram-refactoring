from dependencies import get_base_registry_repository, get_registry_session
from dependencies import get_base_registry_service as load_base_registry_service
from interfaces.services.bases import IBaseRegistryService
from schemas.bases import AgentAccessMode, RegistryEntryRecord, WorkingBaseRecord

from .protocol import MCPServerApp


def get_base_registry_service() -> IBaseRegistryService:
    return load_base_registry_service(get_base_registry_repository(get_registry_session()))


def base_register_base(
    path: str,
    activate: bool = False,
    display_name: str | None = None,
) -> RegistryEntryRecord:
    return get_base_registry_service().register(path, activate, display_name)


def base_create_base(display_name: str, path: str, activate: bool = False) -> RegistryEntryRecord:
    return get_base_registry_service().create(path, display_name, activate)


def base_switch_base(entry_id: str) -> RegistryEntryRecord:
    return get_base_registry_service().switch(entry_id)


def base_rename_base(entry_id: str, display_name: str) -> RegistryEntryRecord:
    return get_base_registry_service().rename(entry_id, display_name)


def base_unregister_base(entry_id: str) -> None:
    get_base_registry_service().unregister(entry_id)


def base_delete_base(entry_id: str, force: bool = False) -> None:
    get_base_registry_service().delete(entry_id, force)


def working_base_list_bases() -> list[WorkingBaseRecord]:
    return get_base_registry_service().list_working_bases()


def working_base_get_current_base() -> WorkingBaseRecord | None:
    return get_base_registry_service().get_current_working_base()


def working_base_select_base(base_ref: str) -> WorkingBaseRecord:
    return get_base_registry_service().select_working_base(base_ref)


def base_set_agent_access_mode(
    entry_id: str,
    agent_access_mode: AgentAccessMode,
) -> RegistryEntryRecord:
    return get_base_registry_service().set_agent_access_mode(entry_id, agent_access_mode)


def register(mcp: MCPServerApp) -> None:
    mcp.tool()(base_register_base)
    mcp.tool()(base_create_base)
    mcp.tool()(base_switch_base)
    mcp.tool()(base_rename_base)
    mcp.tool()(base_unregister_base)
    mcp.tool()(base_delete_base)
    mcp.tool()(base_set_agent_access_mode)
    mcp.tool()(working_base_list_bases)
    mcp.tool()(working_base_get_current_base)
    mcp.tool()(working_base_select_base)
