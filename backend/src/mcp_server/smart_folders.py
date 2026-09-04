from dependencies import (
    get_access_http_client,
    get_access_relay,
    get_access_repository,
    get_access_service,
    get_access_settings,
    get_link_repository,
    get_page_repository,
    get_smart_folder_repository,
    get_working_base,
)
from dependencies import get_link_service as load_link_service
from dependencies import get_smart_folder_service as load_smart_folder_service
from interfaces.services.smart_folders import ISmartFolderService
from schemas.smart_folders import (
    FilterPresetDeletedResponse,
    FilterPresetListResponse,
    FilterPresetRecord,
    FilterState,
    SmartFolderGraph,
)

from .protocol import MCPServerApp, register_tools


def get_smart_folder_service(
    base_ref: str | None = None,
    write: bool = False,
    recipient_actor_ref: str | None = None,
) -> ISmartFolderService:
    if write:
        get_working_base(base_ref, True)

    page_repository = get_page_repository(
        base_ref=base_ref,
        recipient_actor_ref=recipient_actor_ref,
    )
    link_repository = get_link_repository(
        base_ref=base_ref,
        recipient_actor_ref=recipient_actor_ref,
    )

    return load_smart_folder_service(
        get_smart_folder_repository(),
        page_repository,
        link_repository,
        load_link_service(link_repository, page_repository),
        get_access_service(
            access_repository=get_access_repository(),
            access_relay=get_access_relay(),
            http_client=get_access_http_client(),
            settings=get_access_settings(),
        ),
    )


def list_smart_folder_presets() -> FilterPresetListResponse:
    return FilterPresetListResponse(items=get_smart_folder_service().list_presets())


def get_smart_folder_preset(preset_id: str) -> FilterPresetRecord:
    return get_smart_folder_service().get_preset(preset_id)


def create_smart_folder_preset(name: str, filter_state: FilterState) -> FilterPresetRecord:
    return get_smart_folder_service().create_preset(name, filter_state)


def update_smart_folder_preset(
    preset_id: str,
    name: str | None = None,
    filter_state: FilterState | None = None,
) -> FilterPresetRecord:
    return get_smart_folder_service().update_preset(preset_id, name, filter_state)


def delete_smart_folder_preset(preset_id: str) -> FilterPresetDeletedResponse:
    return get_smart_folder_service().delete_preset(preset_id)


def get_smart_folder_graph(
    preset_id: str | None = None,
    filter_state: FilterState | None = None,
    expand_hops: int = 2,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> SmartFolderGraph:
    return get_smart_folder_service(
        base_ref,
        recipient_actor_ref=recipient_actor_ref,
    ).get_smart_folder_graph(
        preset_id,
        filter_state,
        expand_hops,
    )


def register(mcp: MCPServerApp) -> None:
    register_tools(
        mcp,
        list_smart_folder_presets,
        get_smart_folder_preset,
        create_smart_folder_preset,
        update_smart_folder_preset,
        delete_smart_folder_preset,
        get_smart_folder_graph,
    )
