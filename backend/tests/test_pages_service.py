import pytest

from exceptions.pages import (
    HubParentError,
    PageNotDeletedError,
    PageNotFoundError,
    PagePromotionError,
    PageTextNotFoundError,
)
from schemas.pages import PageCreate, PageStatus, PageType, PageUpdate
from services.pages import PageService


def test_create_get_list_and_parent_tree(page_service: PageService) -> None:
    parent = page_service.create_page(PageCreate(title="Root", content="root body"))
    child = page_service.create_page(
        PageCreate(title="Child", content="child body", parent_id=parent.id)
    )

    fetched = page_service.get_page(child.id)

    assert fetched.title == "Child"
    assert fetched.parent is not None
    assert fetched.parent.id == parent.id
    assert fetched.content.startswith("# Child")
    assert fetched.content_hash is not None
    assert fetched.connected_to == []
    assert fetched.inline_mentions == []
    assert fetched.sub_items == []

    parent_detail = page_service.get_page(parent.id)

    assert parent_detail.sub_items[0].id == child.id

    roots = page_service.list_pages(
        status=parent.status,
        parent_id=None,
        roots_only=True,
        limit=100,
        offset=0,
    )

    assert [item.id for item in roots] == [parent.id]

    children = page_service.list_pages(
        status=parent.status,
        parent_id=parent.id,
        roots_only=False,
        limit=100,
        offset=0,
    )

    assert [item.id for item in children] == [child.id]
    assert children[0].child_count == 0
    assert roots[0].child_count == 1
    assert roots[0].active_descendant_count == 1


def test_create_replaces_existing_heading_and_empty_body(page_service: PageService) -> None:
    empty = page_service.create_page(PageCreate(title="Empty"))

    assert empty.content == "# Empty\n\n"

    rewritten = page_service.create_page(
        PageCreate(title="Named", content="# Old title\n\n\nkept body")
    )

    assert rewritten.content == "# Named\n\nkept body"

    plain = page_service.create_page(PageCreate(title="Plain", content="just body"))

    assert plain.content == "# Plain\n\njust body"


def test_hub_must_be_root(page_service: PageService) -> None:
    parent = page_service.create_page(PageCreate(title="Root"))

    with pytest.raises(HubParentError):
        page_service.create_page(
            PageCreate(title="Nested hub", type=PageType.HUB, parent_id=parent.id)
        )

    hub = page_service.create_page(PageCreate(title="Hub", type=PageType.HUB))

    assert hub.parent_id is None

    with pytest.raises(HubParentError):
        page_service.update_page(hub.id, PageUpdate(parent_id=parent.id))

    child = page_service.create_page(PageCreate(title="Child", parent_id=parent.id))

    with pytest.raises(HubParentError):
        page_service.update_page(child.id, PageUpdate(type=PageType.HUB))


def test_update_keeps_unset_fields_and_can_clear_parent(page_service: PageService) -> None:
    parent = page_service.create_page(PageCreate(title="Root"))
    page = page_service.create_page(
        PageCreate(
            title="Note",
            content="body",
            subject=["alpha"],
            tags=["one"],
            parent_id=parent.id,
            review_interval_days=14,
        )
    )

    updated = page_service.update_page(page.id, PageUpdate(title="Renamed"))

    assert updated.title == "Renamed"
    assert updated.content.startswith("# Renamed")
    assert "body" in updated.content
    assert updated.subject == ["alpha"]
    assert updated.tags == ["one"]
    assert updated.parent_id == parent.id
    assert updated.review_interval_days == 14

    cleared = page_service.update_page(page.id, PageUpdate(parent_id=None))

    assert cleared.parent_id is None
    assert cleared.parent is None


def test_missing_page_operations_raise_not_found(page_service: PageService) -> None:
    missing = "01MISSINGPAGE00000000000000"

    with pytest.raises(PageNotFoundError):
        page_service.get_page(missing)

    with pytest.raises(PageNotFoundError):
        page_service.update_page(missing, PageUpdate(title="Nope"))

    with pytest.raises(PageNotFoundError):
        page_service.delete_page(missing)

    with pytest.raises(PageNotFoundError):
        page_service.restore_page(missing)

    with pytest.raises(PageNotFoundError):
        page_service.purge_page(missing)

    with pytest.raises(PageNotFoundError):
        page_service.mark_reviewed(missing)

    with pytest.raises(PageNotFoundError):
        page_service.promote_page(missing)

    with pytest.raises(PageNotFoundError):
        page_service.get_page_ancestry(missing)


def test_delete_restore_and_purge_require_deleted_state(page_service: PageService) -> None:
    page = page_service.create_page(PageCreate(title="Note"))

    with pytest.raises(PageNotDeletedError):
        page_service.restore_page(page.id)

    with pytest.raises(PageNotDeletedError):
        page_service.purge_page(page.id)

    page_service.delete_page(page.id)

    active = page_service.list_pages(
        status=PageStatus.ACTIVE,
        parent_id=None,
        roots_only=True,
        limit=100,
        offset=0,
    )
    deleted = page_service.list_pages(
        status=PageStatus.TO_DELETE,
        parent_id=None,
        roots_only=True,
        limit=100,
        offset=0,
    )

    assert active == []
    assert [item.id for item in deleted] == [page.id]

    restored = page_service.restore_page(page.id)

    assert restored.status is PageStatus.ACTIVE

    page_service.delete_page(page.id)
    purged = page_service.purge_page(page.id)

    assert purged.purged is True

    with pytest.raises(PageNotFoundError):
        page_service.get_page(page.id)


def test_deleted_child_is_hidden_from_parent_and_counts(page_service: PageService) -> None:
    parent = page_service.create_page(PageCreate(title="Root"))
    child = page_service.create_page(PageCreate(title="Child", parent_id=parent.id))

    page_service.delete_page(child.id)

    parent_detail = page_service.get_page(parent.id)
    roots = page_service.list_pages(
        status=PageStatus.ACTIVE,
        parent_id=None,
        roots_only=True,
        limit=100,
        offset=0,
    )

    assert parent_detail.sub_items == []
    assert roots[0].child_count == 0
    assert roots[0].active_descendant_count == 0


def test_promote_maturity_path_and_blocked_types(page_service: PageService) -> None:
    page = page_service.create_page(PageCreate(title="Note", type=PageType.FLEETING))

    first = page_service.promote_page(page.id)

    assert first.previous_type is PageType.FLEETING
    assert first.new_type is PageType.NOTE_TAKING

    second = page_service.promote_page(page.id)

    assert second.previous_type is PageType.NOTE_TAKING
    assert second.new_type is PageType.PERMANENT

    with pytest.raises(PagePromotionError):
        page_service.promote_page(page.id)

    structure = page_service.create_page(PageCreate(title="Map", type=PageType.STRUCTURE))
    hub = page_service.create_page(PageCreate(title="Hub", type=PageType.HUB))

    with pytest.raises(PagePromotionError):
        page_service.promote_page(structure.id)

    with pytest.raises(PagePromotionError):
        page_service.promote_page(hub.id)


def test_review_sets_next_review_from_interval(page_service: PageService) -> None:
    page = page_service.create_page(
        PageCreate(title="Note", review_interval_days=3)
    )

    assert page.reviewed_at is None
    assert page.next_review_at is None

    reviewed = page_service.mark_reviewed(page.id)
    detail = page_service.get_page(page.id)

    assert reviewed.reviewed_at == detail.reviewed_at
    assert detail.next_review_at is not None
    assert detail.next_review_at > detail.reviewed_at


def test_search_empty_query_quotes_and_multiple_tokens(page_service: PageService) -> None:
    matching = page_service.create_page(
        PageCreate(title="Searchable", content="unique token pair")
    )
    page_service.create_page(PageCreate(title="Other", content="unrelated"))

    assert page_service.search_pages("", limit=10) == []
    assert page_service.search_pages("   ", limit=10) == []
    assert page_service.search_pages("nomatch", limit=10) == []

    quoted = page_service.search_pages('"unique"', limit=10)

    assert [hit.id for hit in quoted] == [matching.id]

    both = page_service.search_pages("unique pair", limit=10)

    assert [hit.id for hit in both] == [matching.id]


def test_ancestry_root_chain_missing_parent_and_cycle(page_service: PageService) -> None:
    root = page_service.create_page(PageCreate(title="Root"))
    middle = page_service.create_page(PageCreate(title="Middle", parent_id=root.id))
    leaf = page_service.create_page(PageCreate(title="Leaf", parent_id=middle.id))

    assert page_service.get_page_ancestry(root.id) == []
    assert [item.id for item in page_service.get_page_ancestry(leaf.id)] == [root.id, middle.id]

    orphan = page_service.create_page(
        PageCreate(title="Orphan", parent_id="01MISSINGPARENT000000000000")
    )

    assert page_service.get_page_ancestry(orphan.id) == []
    assert page_service.get_page(orphan.id).parent is None

    page_service.update_page(root.id, PageUpdate(parent_id=leaf.id))

    assert [item.id for item in page_service.get_page_ancestry(leaf.id)] == [root.id, middle.id]


def test_list_respects_status_limit_and_offset(page_service: PageService) -> None:
    first = page_service.create_page(PageCreate(title="First"))
    page_service.create_page(PageCreate(title="Second"))
    page_service.create_page(PageCreate(title="Third"))
    page_service.update_page(first.id, PageUpdate(status=PageStatus.ARCHIVED))

    archived = page_service.list_pages(
        status=PageStatus.ARCHIVED,
        parent_id=None,
        roots_only=True,
        limit=100,
        offset=0,
    )
    page = page_service.list_pages(
        status=PageStatus.ACTIVE,
        parent_id=None,
        roots_only=True,
        limit=1,
        offset=1,
    )

    assert [item.id for item in archived] == [first.id]
    assert len(page) == 1


def test_descendant_count_includes_nested_active_pages(page_service: PageService) -> None:
    root = page_service.create_page(PageCreate(title="Root"))
    middle = page_service.create_page(PageCreate(title="Middle", parent_id=root.id))
    page_service.create_page(PageCreate(title="Leaf", parent_id=middle.id))

    roots = page_service.list_pages(
        status=PageStatus.ACTIVE,
        parent_id=None,
        roots_only=True,
        limit=100,
        offset=0,
    )

    assert roots[0].child_count == 1
    assert roots[0].active_descendant_count == 2


def test_update_content_rewrites_heading_and_changes_hash(page_service: PageService) -> None:
    page = page_service.create_page(PageCreate(title="Note", content="old body"))
    original_hash = page.content_hash

    updated = page_service.update_page(page.id, PageUpdate(content="new body"))

    assert updated.title == "Note"
    assert updated.content == "# Note\n\nnew body"
    assert updated.content_hash != original_hash


def test_set_parent_and_inline_link_require_existing_page(page_service: PageService) -> None:
    missing = "01MISSINGPAGE00000000000000"

    with pytest.raises(PageNotFoundError):
        page_service.set_parent(missing, None)

    with pytest.raises(PageNotFoundError):
        page_service.get_inline_link(missing)


def test_restore_after_restore_and_double_delete(page_service: PageService) -> None:
    page = page_service.create_page(PageCreate(title="Note"))

    page_service.delete_page(page.id)
    page_service.delete_page(page.id)
    restored = page_service.restore_page(page.id)

    assert restored.status is PageStatus.ACTIVE

    with pytest.raises(PageNotDeletedError):
        page_service.restore_page(page.id)


def test_search_excludes_deleted_and_resolves_inline_links(
    page_service: PageService,
) -> None:
    page = page_service.create_page(PageCreate(title="Keep", content="findme token"))
    mentioned = page_service.create_page(PageCreate(title="Target"))
    linked = page_service.create_page(
        PageCreate(
            title="Mentions",
            content=f"[[NotALink]] and [[{mentioned.id}|Shown]]",
        )
    )

    page_service.delete_page(page.id)
    hits = page_service.search_pages("findme", limit=10)

    assert hits == []
    assert [item.id for item in linked.inline_mentions] == [mentioned.id]


def test_replace_in_page_replaces_first_match(page_service: PageService) -> None:
    page = page_service.create_page(PageCreate(title="Note", content="alpha alpha"))
    updated = page_service.replace_in_page(page.id, "alpha", "beta")

    assert updated.content == "# Note\n\nbeta alpha"


def test_replace_in_page_missing_text(page_service: PageService) -> None:
    page = page_service.create_page(PageCreate(title="Note", content="alpha"))

    with pytest.raises(PageTextNotFoundError):
        page_service.replace_in_page(page.id, "missing", "beta")


def test_archived_child_is_hidden_from_parent(page_service: PageService) -> None:
    parent = page_service.create_page(PageCreate(title="Root"))
    child = page_service.create_page(PageCreate(title="Child", parent_id=parent.id))

    page_service.update_page(child.id, PageUpdate(status=PageStatus.ARCHIVED))

    parent_detail = page_service.get_page(parent.id)
    archived = page_service.list_pages(
        status=PageStatus.ARCHIVED,
        parent_id=parent.id,
        roots_only=False,
        limit=100,
        offset=0,
    )

    assert parent_detail.sub_items == []
    assert [item.id for item in archived] == [child.id]


def test_create_keeps_missing_parent_id(page_service: PageService) -> None:
    page = page_service.create_page(
        PageCreate(title="Orphan", parent_id="01MISSINGPARENT000000000000")
    )

    assert page.parent_id == "01MISSINGPARENT000000000000"
    assert page.parent is None
