from fastapi import APIRouter, Depends

from dependencies import get_base_registry_service
from interfaces.services.bases import IBaseRegistryService
from schemas.bases import (
    AgentAccessModeUpdate,
    BaseCreateRequest,
    BaseDeletedResponse,
    BaseDeleteRequest,
    BaseRegisterRequest,
    BaseRenameRequest,
    BaseReplaceActiveRequest,
    BaseUnregisteredResponse,
    ManagedBaseRefreshRequest,
    ManagedBaseSummaryResponse,
    RegistryEntryListResponse,
    RegistryEntryResponse,
)

bases_router = APIRouter(prefix="/api/bases")


@bases_router.get("", response_model=RegistryEntryListResponse)
def list_bases(
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> RegistryEntryListResponse:
    items = base_registry_service.list_bases()
    return RegistryEntryListResponse(
        items=items,
        active_base=base_registry_service.get_active(),
        built_in_bases=base_registry_service.list_managed_bases(),
    )


@bases_router.post("/register", response_model=RegistryEntryResponse, status_code=201)
def register_base(
    payload: BaseRegisterRequest,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> RegistryEntryResponse:
    return RegistryEntryResponse(
        item=base_registry_service.register(
            payload.path,
            payload.activate,
            payload.display_name,
        )
    )


@bases_router.post("/create", response_model=RegistryEntryResponse, status_code=201)
def create_base(
    payload: BaseCreateRequest,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> RegistryEntryResponse:
    return RegistryEntryResponse(
        item=base_registry_service.create(payload.path, payload.display_name, payload.activate)
    )


@bases_router.post("/managed/{kind}/refresh", response_model=ManagedBaseSummaryResponse)
def refresh_managed_base(
    kind: str,
    payload: ManagedBaseRefreshRequest | None = None,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> ManagedBaseSummaryResponse:
    locale = None

    if payload is not None:
        locale = payload.locale

    return ManagedBaseSummaryResponse(
        item=base_registry_service.refresh_managed_base(kind, locale)
    )


@bases_router.post("/replace-active", response_model=RegistryEntryResponse)
def replace_active_base(
    payload: BaseReplaceActiveRequest,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> RegistryEntryResponse:
    return RegistryEntryResponse(item=base_registry_service.replace_active(payload.path))


@bases_router.post("/{entry_id}/switch", response_model=RegistryEntryResponse)
def switch_base(
    entry_id: str,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> RegistryEntryResponse:
    return RegistryEntryResponse(item=base_registry_service.switch(entry_id))


@bases_router.post("/{entry_id}/unregister", response_model=BaseUnregisteredResponse)
def unregister_base(
    entry_id: str,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> BaseUnregisteredResponse:
    base_registry_service.unregister(entry_id)

    return BaseUnregisteredResponse(removed=True, entry_id=entry_id)


@bases_router.put("/{entry_id}/rename", response_model=RegistryEntryResponse)
def rename_base(
    entry_id: str,
    payload: BaseRenameRequest,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> RegistryEntryResponse:
    return RegistryEntryResponse(item=base_registry_service.rename(entry_id, payload.display_name))


@bases_router.post("/{entry_id}/delete", response_model=BaseDeletedResponse)
def delete_base(
    entry_id: str,
    payload: BaseDeleteRequest,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> BaseDeletedResponse:
    path = base_registry_service.get_entry(entry_id).path
    base_registry_service.delete(entry_id, payload.force)

    return BaseDeletedResponse(deleted=True, path=path)


@bases_router.post("/{entry_id}/mcp-visibility", response_model=RegistryEntryResponse)
def set_base_mcp_visibility(
    entry_id: str,
    payload: AgentAccessModeUpdate,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> RegistryEntryResponse:
    return RegistryEntryResponse(
        item=base_registry_service.set_agent_access_mode(entry_id, payload.agent_access_mode)
    )
