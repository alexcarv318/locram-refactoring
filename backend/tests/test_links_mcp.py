import pytest

import mcp.links as mcp_links
import mcp.pages as mcp_pages
from exceptions.links import SelfLinkError
from exceptions.pages import HubParentError
from schemas.links import LinkCreate, LinkType
from schemas.pages import PageType
from services.links import LinkService
from services.pages import PageService


def test_mcp_link_tools(mcp_services: tuple[PageService, LinkService]) -> None:
    source = mcp_pages.create_page(title="Source")
    target = mcp_pages.create_page(title="Target")

    linked = mcp_links.link_pages(source.id, target.id, LinkType.REFINES)

    assert linked.created is True

    fetched = mcp_pages.get_page(source.id)

    assert fetched.connected_to[0].id == target.id
    assert fetched.connected_to[0].link_type == "refines"

    inline = mcp_pages.get_inline_link(target.id)

    assert inline.link == f"[[{target.id}|Target]]"

    unlinked = mcp_links.unlink_pages(source.id, target.id, LinkType.REFINES)

    assert unlinked.unlinked is True
    assert mcp_pages.get_page(source.id).connected_to == []


def test_mcp_set_parent_and_batch(mcp_services: tuple[PageService, LinkService]) -> None:
    parent = mcp_pages.create_page(title="Root")
    child = mcp_pages.create_page(title="Child")
    other = mcp_pages.create_page(title="Other")
    hub = mcp_pages.create_page(title="Hub", type=PageType.HUB)

    moved = mcp_links.set_parent(child.id, parent.id)

    assert moved.parent_id == parent.id

    batch = mcp_links.batch_link(
        [LinkCreate(source_id=child.id, target_id=other.id, link_type=LinkType.RELATED)]
    )

    assert batch.created == 1

    with pytest.raises(HubParentError):
        mcp_links.set_parent(hub.id, parent.id)

    with pytest.raises(SelfLinkError):
        mcp_links.link_pages(child.id, child.id, LinkType.RELATED)


def test_mcp_unlink_all_and_reference(mcp_services: tuple[PageService, LinkService]) -> None:
    source = mcp_pages.create_page(title="Source")
    target = mcp_pages.create_page(title="Target")

    mcp_links.link_pages(source.id, target.id, LinkType.REFERENCE)
    mcp_links.link_pages(source.id, target.id, LinkType.RELATED)

    fetched = mcp_pages.get_page(source.id)

    assert {item.link_type for item in fetched.connected_to} >= {"reference", "related"}

    mcp_links.unlink_pages(source.id, target.id)

    assert mcp_pages.get_page(source.id).connected_to == []
