from dependencies import (
    get_link_repository,
    get_page_repository,
    get_session,
    get_smart_folder_repository,
)
from dependencies import get_link_service as load_link_service
from dependencies import get_smart_folder_service as load_smart_folder_service
from interfaces.services.smart_folders import ISmartFolderService
from schemas.smart_folders import (
    FilterPresetDeletedResponse,
    FilterPresetRecord,
    FilterState,
    SmartFolderGraph,
)

from .protocol import MCPServerApp


def get_smart_folder_service() -> ISmartFolderService:
    db = get_session()
    page_repository = get_page_repository(db)
    link_repository = get_link_repository(db)

    return load_smart_folder_service(
        get_smart_folder_repository(),
        page_repository,
        link_repository,
        load_link_service(link_repository, page_repository),
    )


def list_smart_folder_presets() -> list[FilterPresetRecord]:
    return get_smart_folder_service().list_presets()


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
) -> SmartFolderGraph:
    return get_smart_folder_service().get_smart_folder_graph(
        preset_id,
        filter_state,
        expand_hops,
    )


def register(mcp: MCPServerApp) -> None:
    mcp.tool()(list_smart_folder_presets)
    mcp.tool()(get_smart_folder_preset)
    mcp.tool()(create_smart_folder_preset)
    mcp.tool()(update_smart_folder_preset)
    mcp.tool()(delete_smart_folder_preset)
    mcp.tool()(get_smart_folder_graph)
