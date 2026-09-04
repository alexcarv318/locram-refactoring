from dependencies import (
    get_access_http_client,
    get_access_relay,
    get_access_repository,
    get_access_service,
    get_access_settings,
    get_base_registry_repository,
    get_managed_base_repository,
    get_registry_session,
)
from dependencies import get_base_registry_service as load_base_registry_service
from interfaces.services.bases import IBaseRegistryService
from schemas.bases import (
    AgentAccessMode,
    BaseDeletedResponse,
    BaseUnregisteredResponse,
    RegistryEntryRecord,
    WorkingBaseListResponse,
    WorkingBaseRecord,
)

from .protocol import MCPServerApp, register_tools


def get_base_registry_service() -> IBaseRegistryService:
    return load_base_registry_service(
        base_registry_repository=get_base_registry_repository(get_registry_session()),
        managed_base_repository=get_managed_base_repository(),
        access_service=get_access_service(
            access_repository=get_access_repository(),
            access_relay=get_access_relay(),
            http_client=get_access_http_client(),
            settings=get_access_settings(),
        ),
    )


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


def base_unregister_base(entry_id: str) -> BaseUnregisteredResponse:
    get_base_registry_service().unregister(entry_id)

    return BaseUnregisteredResponse(removed=True, entry_id=entry_id)


def base_delete_base(entry_id: str, force: bool = False) -> BaseDeletedResponse:
    service = get_base_registry_service()
    path = service.get_entry(entry_id).path

    service.delete(entry_id, force)

    return BaseDeletedResponse(deleted=True, path=path)


def working_base_list_bases() -> WorkingBaseListResponse:
    return WorkingBaseListResponse(items=get_base_registry_service().list_working_bases())


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
    register_tools(
        mcp,
        base_register_base,
        base_create_base,
        base_switch_base,
        base_rename_base,
        base_unregister_base,
        base_delete_base,
        base_set_agent_access_mode,
        working_base_list_bases,
        working_base_get_current_base,
        working_base_select_base,
    )
