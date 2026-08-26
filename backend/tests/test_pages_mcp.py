import pytest

import mcp.pages as mcp_pages
from exceptions.pages import (
    HubParentError,
    PageNotDeletedError,
    PageNotFoundError,
    PagePromotionError,
)
from schemas.pages import PageStatus, PageType
from services.pages import PageService


def test_mcp_page_tools(mcp_page_service: PageService) -> None:
    created = mcp_pages.create_page(title="MCP note", content="from tool")
    fetched = mcp_pages.get_page(created.id)
    items = mcp_pages.list_pages()

    assert fetched.title == "MCP note"
    assert fetched.content.startswith("# MCP note")
    assert any(item.id == created.id for item in items)


def test_mcp_update_search_ancestry_and_lifecycle(mcp_page_service: PageService) -> None:
    parent = mcp_pages.create_page(title="Root", content="system design")
    child = mcp_pages.create_page(title="Child", content="page service", parent_id=parent.id)

    updated = mcp_pages.update_page(child.id, title="Renamed")

    assert updated.title == "Renamed"
    assert updated.parent_id == parent.id

    hits = mcp_pages.search("page")

    assert any(hit.id == child.id for hit in hits)
    assert mcp_pages.search("   ") == []

    ancestry = mcp_pages.get_page_ancestry(child.id)

    assert [item.id for item in ancestry] == [parent.id]

    roots = mcp_pages.list_pages(parent_id="root")

    assert [item.id for item in roots] == [parent.id]

    promoted = mcp_pages.promote_page(child.id)

    assert promoted.new_type is PageType.NOTE_TAKING

    reviewed = mcp_pages.mark_reviewed(child.id)

    assert reviewed.reviewed_at

    mcp_pages.delete_page(child.id)
    restored = mcp_pages.restore_page(child.id)

    assert restored.status is PageStatus.ACTIVE

    mcp_pages.delete_page(child.id)
    purged = mcp_pages.purge_page(child.id)

    assert purged.purged is True


def test_mcp_page_tool_errors(mcp_page_service: PageService) -> None:
    parent = mcp_pages.create_page(title="Root")
    missing = "01MISSINGPAGE00000000000000"

    with pytest.raises(HubParentError):
        mcp_pages.create_page(title="Hub", type=PageType.HUB, parent_id=parent.id)

    with pytest.raises(PageNotFoundError):
        mcp_pages.get_page(missing)

    with pytest.raises(PageNotDeletedError):
        mcp_pages.restore_page(parent.id)

    permanent = mcp_pages.create_page(title="Done", type=PageType.PERMANENT)

    with pytest.raises(PagePromotionError):
        mcp_pages.promote_page(permanent.id)


def test_mcp_set_parent_and_inline_link_errors(mcp_page_service: PageService) -> None:
    missing = "01MISSINGPAGE00000000000000"

    with pytest.raises(PageNotFoundError):
        mcp_pages.get_inline_link(missing)

    with pytest.raises(PageNotFoundError):
        mcp_pages.update_page(missing, title="Nope")


def test_mcp_replace_in_page(mcp_page_service: PageService) -> None:
    page = mcp_pages.create_page(title="Note", content="alpha alpha")
    updated = mcp_pages.replace_in_page(page.id, "alpha", "beta")

    assert updated.content == "# Note\n\nbeta alpha"
