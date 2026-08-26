from fastapi import APIRouter, Depends

from dependencies import get_base_registry_service
from interfaces.services.bases import IBaseRegistryService
from schemas.bases import (
    AgentAccessModeUpdate,
    BaseCreateRequest,
    BaseDeleteRequest,
    BaseRegisterRequest,
    BaseRenameRequest,
    RegistryEntryListResponse,
    RegistryEntryResponse,
)

bases_router = APIRouter(prefix="/api/bases")


@bases_router.get("", response_model=RegistryEntryListResponse)
def list_bases(
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> RegistryEntryListResponse:
    items = base_registry_service.list_bases()
    return RegistryEntryListResponse(items=items, active_base=base_registry_service.get_active())


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


@bases_router.post("/{entry_id}/switch", response_model=RegistryEntryResponse)
def switch_base(
    entry_id: str,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> RegistryEntryResponse:
    return RegistryEntryResponse(item=base_registry_service.switch(entry_id))


@bases_router.post("/{entry_id}/unregister", status_code=204)
def unregister_base(
    entry_id: str,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> None:
    base_registry_service.unregister(entry_id)


@bases_router.put("/{entry_id}/rename", response_model=RegistryEntryResponse)
def rename_base(
    entry_id: str,
    payload: BaseRenameRequest,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> RegistryEntryResponse:
    return RegistryEntryResponse(item=base_registry_service.rename(entry_id, payload.display_name))


@bases_router.post("/{entry_id}/delete", status_code=204)
def delete_base(
    entry_id: str,
    payload: BaseDeleteRequest,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> None:
    base_registry_service.delete(entry_id, payload.force)


@bases_router.patch("/{entry_id}/mcp-visibility", response_model=RegistryEntryResponse)
def set_base_mcp_visibility(
    entry_id: str,
    payload: AgentAccessModeUpdate,
    base_registry_service: IBaseRegistryService = Depends(get_base_registry_service),
) -> RegistryEntryResponse:
    return RegistryEntryResponse(
        item=base_registry_service.set_agent_access_mode(entry_id, payload.agent_access_mode)
    )
