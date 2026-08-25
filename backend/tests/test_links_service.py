import pytest

from exceptions.links import SelfLinkError
from exceptions.pages import HubParentError, PageNotFoundError
from schemas.links import LinkCreate, LinkType
from schemas.pages import PageCreate, PageType
from services.links import LinkService
from services.pages import PageService


def test_related_link_creates_symmetric_pair(
    services: tuple[PageService, LinkService],
) -> None:
    pages, links = services
    source = pages.create_page(PageCreate(title="Source"))
    target = pages.create_page(PageCreate(title="Target"))

    result = links.link_pages(source.id, target.id, LinkType.RELATED)

    assert result.created is True
    assert result.created_primary is True
    assert result.created_inverse is True

    source_detail = pages.get_page(source.id)
    target_detail = pages.get_page(target.id)

    assert {(item.id, item.link_type, item.direction) for item in source_detail.connected_to} == {
        (target.id, "related", "outgoing"),
        (target.id, "related", "incoming"),
    }
    assert {(item.id, item.link_type, item.direction) for item in target_detail.connected_to} == {
        (source.id, "related", "outgoing"),
        (source.id, "related", "incoming"),
    }


def test_directional_link_creates_inverse_type(
    services: tuple[PageService, LinkService],
) -> None:
    pages, links = services
    source = pages.create_page(PageCreate(title="Source"))
    target = pages.create_page(PageCreate(title="Target"))

    links.link_pages(source.id, target.id, LinkType.EXTENDS)

    source_detail = pages.get_page(source.id)
    target_detail = pages.get_page(target.id)

    assert {(item.link_type, item.direction) for item in source_detail.connected_to} == {
        ("extends", "outgoing"),
        ("extended_by", "incoming"),
    }
    assert {(item.link_type, item.direction) for item in target_detail.connected_to} == {
        ("extended_by", "outgoing"),
        ("extends", "incoming"),
    }


def test_reference_has_no_inverse(services: tuple[PageService, LinkService]) -> None:
    pages, links = services
    source = pages.create_page(PageCreate(title="Source"))
    target = pages.create_page(PageCreate(title="Target"))

    result = links.link_pages(source.id, target.id, LinkType.REFERENCE)

    assert result.created_inverse is False
    assert pages.get_page(target.id).connected_to[0].direction == "incoming"
    assert pages.get_page(target.id).connected_to[0].link_type == "reference"


def test_duplicate_link_is_already_exists(services: tuple[PageService, LinkService]) -> None:
    pages, links = services
    source = pages.create_page(PageCreate(title="Source"))
    target = pages.create_page(PageCreate(title="Target"))

    links.link_pages(source.id, target.id, LinkType.RELATED)
    again = links.link_pages(source.id, target.id, LinkType.RELATED)

    assert again.created is False
    assert again.already_exists is True
    assert again.created_primary is False
    assert again.created_inverse is False


def test_self_link_and_missing_pages_are_rejected(
    services: tuple[PageService, LinkService],
) -> None:
    pages, links = services
    page = pages.create_page(PageCreate(title="Alone"))

    with pytest.raises(SelfLinkError):
        links.link_pages(page.id, page.id, LinkType.RELATED)

    with pytest.raises(PageNotFoundError):
        links.link_pages(page.id, "01MISSINGPAGE00000000000000", LinkType.RELATED)

    with pytest.raises(PageNotFoundError):
        links.link_pages("01MISSINGPAGE00000000000000", page.id, LinkType.RELATED)


def test_unlink_typed_and_all_directions(services: tuple[PageService, LinkService]) -> None:
    pages, links = services
    source = pages.create_page(PageCreate(title="Source"))
    target = pages.create_page(PageCreate(title="Target"))

    links.link_pages(source.id, target.id, LinkType.SUPPORTS)
    links.unlink_pages(source.id, target.id, LinkType.SUPPORTS)

    assert pages.get_page(source.id).connected_to == []
    assert pages.get_page(target.id).connected_to == []

    links.link_pages(source.id, target.id, LinkType.EXTENDS)
    links.link_pages(source.id, target.id, LinkType.RELATED)
    links.unlink_pages(source.id, target.id, None)

    assert pages.get_page(source.id).connected_to == []
    assert pages.get_page(target.id).connected_to == []

    missing = links.unlink_pages(source.id, target.id, LinkType.RELATED)

    assert missing.unlinked is True


def test_inline_mentions_from_canonical_links(
    services: tuple[PageService, LinkService],
) -> None:
    pages, _links = services
    mentioned = pages.create_page(PageCreate(title="Real title"))
    content = (
        f"See [[{mentioned.id}|Old title]] and "
        f"[[{mentioned.id}|Again]] and "
        "[[01MISSINGPAGE0000000000000|Ghost]]"
    )
    note = pages.create_page(PageCreate(title="Note", content=content))

    assert [(item.id, item.title) for item in note.inline_mentions] == [
        (mentioned.id, "Real title"),
        ("01MISSINGPAGE0000000000000", "Ghost"),
    ]

    inline = pages.get_inline_link(mentioned.id)

    assert inline.link == f"[[{mentioned.id}|Real title]]"


def test_set_parent_and_hub_rules(services: tuple[PageService, LinkService]) -> None:
    pages, _links = services
    parent = pages.create_page(PageCreate(title="Root"))
    child = pages.create_page(PageCreate(title="Child"))
    hub = pages.create_page(PageCreate(title="Hub", type=PageType.HUB))

    moved = pages.set_parent(child.id, parent.id)

    assert moved.parent_id == parent.id
    assert pages.get_page(child.id).parent is not None

    cleared = pages.set_parent(child.id, None)

    assert cleared.parent_id is None

    with pytest.raises(HubParentError):
        pages.set_parent(hub.id, parent.id)

    with pytest.raises(PageNotFoundError):
        pages.set_parent(child.id, "01MISSINGPAGE00000000000000")


def test_batch_link_counts_created_skipped_and_errors(
    services: tuple[PageService, LinkService],
) -> None:
    pages, links = services
    source = pages.create_page(PageCreate(title="Source"))
    target = pages.create_page(PageCreate(title="Target"))

    first = links.batch_link(
        [
            LinkCreate(source_id=source.id, target_id=target.id, link_type=LinkType.RELATED),
            LinkCreate(source_id=source.id, target_id=source.id, link_type=LinkType.RELATED),
            LinkCreate(
                source_id=source.id,
                target_id="01MISSINGPAGE00000000000000",
                link_type=LinkType.RELATED,
            ),
        ]
    )

    assert first.created == 1
    assert first.skipped == 0
    assert len(first.errors) == 2

    second = links.batch_link(
        [LinkCreate(source_id=source.id, target_id=target.id, link_type=LinkType.RELATED)]
    )

    assert second.created == 0
    assert second.skipped == 1


def test_page_graph_includes_parent_and_typed_edges(
    services: tuple[PageService, LinkService],
) -> None:
    pages, links = services
    root = pages.create_page(PageCreate(title="Root"))
    child = pages.create_page(PageCreate(title="Child", parent_id=root.id))
    neighbor = pages.create_page(PageCreate(title="Neighbor"))

    links.link_pages(child.id, neighbor.id, LinkType.SUPPORTS)

    graph = links.get_page_graph(child.id, expand_hops=1)

    assert graph.selected_page_id == child.id
    assert graph.scope_kind.value == "neighborhood"
    assert {node.id for node in graph.nodes} == {root.id, child.id, neighbor.id}
    assert any(edge.type == "parent" and edge.source == root.id for edge in graph.links)
    assert any(edge.type == "supports" for edge in graph.links)

    hub = pages.create_page(PageCreate(title="Hub", type=PageType.HUB))

    assert links.get_page_graph(hub.id, expand_hops=1).scope_kind.value == "hub_anchor"


def test_graph_missing_page(services: tuple[PageService, LinkService]) -> None:
    _pages, links = services

    with pytest.raises(PageNotFoundError):
        links.get_page_graph("01MISSINGPAGE00000000000000", expand_hops=2)
