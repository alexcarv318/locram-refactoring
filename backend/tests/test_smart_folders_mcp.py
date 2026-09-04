import pytest

import mcp_server.smart_folders as mcp_smart_folders
from exceptions.smart_folders import SmartFolderPreviewError
from schemas.pages import PageCreate
from schemas.smart_folders import ORPHANED_SCOPE_ID, FilterState
from services.pages import PageService
from services.smart_folders import SmartFolderService


def test_mcp_preset_tools(mcp_smart_folder_service: SmartFolderService) -> None:
    created = mcp_smart_folders.create_smart_folder_preset(
        "Tagged",
        FilterState(tags=["bridge"]),
    )
    listed = mcp_smart_folders.list_smart_folder_presets()
    fetched = mcp_smart_folders.get_smart_folder_preset(created.id)
    renamed = mcp_smart_folders.update_smart_folder_preset(created.id, name="Bridge")

    assert listed.items[0].id == created.id
    assert fetched.filter.tags == ["bridge"]
    assert renamed.name == "Bridge"

    deleted = mcp_smart_folders.delete_smart_folder_preset(created.id)

    assert deleted.deleted is True
    assert mcp_smart_folders.list_smart_folder_presets().items == []


def test_mcp_graph_preview(
    mcp_smart_folder_service: SmartFolderService,
    page_service: PageService,
) -> None:
    page_service.create_page(PageCreate(title="Loose"))

    with pytest.raises(SmartFolderPreviewError):
        mcp_smart_folders.get_smart_folder_graph()

    graph = mcp_smart_folders.get_smart_folder_graph(preset_id=ORPHANED_SCOPE_ID, expand_hops=1)
    inline = mcp_smart_folders.get_smart_folder_graph(
        filter_state=FilterState.model_validate({"searchQuery": "loose"}),
        expand_hops=1,
    )

    assert graph.scope_kind == "smart_folder"
    assert any(node.scope_origin == "seed" for node in graph.nodes)
    assert inline.preset_id is None
    assert any(node.title == "Loose" for node in inline.nodes)
