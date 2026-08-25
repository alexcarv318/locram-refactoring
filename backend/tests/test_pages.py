from fastapi.testclient import TestClient

import mcp.pages as mcp_pages
from api.main import app
from database import create_sqlite_engine
from dependencies import get_page_service
from repositories.pages import PageRepository
from schemas.pages import PageCreate, PageType, PageUpdate
from services.pages import PageService


def build_service() -> PageService:
    return PageService(PageRepository(create_sqlite_engine()))


def test_create_get_list_and_parent_tree() -> None:
    service = build_service()
    parent = service.create_page(PageCreate(title="Root", content="root body"))
    child = service.create_page(
        PageCreate(title="Child", content="child body", parent_id=parent.id)
    )

    fetched = service.get_page(child.id)

    assert fetched.title == "Child"
    assert fetched.parent is not None
    assert fetched.parent.id == parent.id
    assert fetched.content.startswith("# Child")

    roots = service.list_pages(
        status=parent.status,
        parent_id=None,
        roots_only=True,
        limit=100,
        offset=0,
    )

    assert [item.id for item in roots] == [parent.id]

    children = service.list_pages(
        status=parent.status,
        parent_id=parent.id,
        roots_only=False,
        limit=100,
        offset=0,
    )

    assert [item.id for item in children] == [child.id]
    assert children[0].child_count == 0
    assert roots[0].child_count == 1


def test_update_delete_restore_purge_promote_and_review() -> None:
    service = build_service()
    page = service.create_page(PageCreate(title="Note", type=PageType.FLEETING))

    updated = service.update_page(page.id, PageUpdate(title="Renamed", content="new"))

    assert updated.title == "Renamed"
    assert updated.content.startswith("# Renamed")

    promoted = service.promote_page(page.id)

    assert promoted.previous_type is PageType.FLEETING
    assert promoted.new_type is PageType.NOTE_TAKING

    reviewed = service.mark_reviewed(page.id)

    assert reviewed.reviewed_at

    service.delete_page(page.id)
    restored = service.restore_page(page.id)

    assert restored.status.value == "active"

    service.delete_page(page.id)
    purged = service.purge_page(page.id)

    assert purged.purged is True


def test_search_and_ancestry() -> None:
    service = build_service()
    parent = service.create_page(PageCreate(title="Architecture", content="system design"))
    child = service.create_page(
        PageCreate(title="Pages", content="page service", parent_id=parent.id)
    )

    hits = service.search_pages("page", limit=10)

    assert any(hit.id == child.id for hit in hits)

    ancestry = service.get_page_ancestry(child.id)

    assert [item.id for item in ancestry] == [parent.id]


def test_http_pages_roundtrip() -> None:
    service = PageService(PageRepository(create_sqlite_engine()))
    app.dependency_overrides[get_page_service] = lambda: service
    client = TestClient(app)

    created = client.post("/api/pages", json={"title": "Hello", "content": "world"})

    assert created.status_code == 201

    page_id = created.json()["item"]["id"]
    listed = client.get("/api/pages?parent_id=root")

    assert listed.status_code == 200
    assert listed.json()["items"][0]["id"] == page_id

    fetched = client.get(f"/api/pages/{page_id}")

    assert fetched.status_code == 200
    assert fetched.json()["item"]["title"] == "Hello"

    deleted = client.delete(f"/api/pages/{page_id}")

    assert deleted.status_code == 200
    assert deleted.json()["deleted"] is True

    app.dependency_overrides.clear()


def test_mcp_page_tools() -> None:
    service = PageService(PageRepository(create_sqlite_engine()))
    mcp_pages.get_page_service = lambda: service

    created = mcp_pages.create_page(title="MCP note", content="from tool")
    fetched = mcp_pages.get_page(created.id)
    items = mcp_pages.list_pages()

    assert fetched.title == "MCP note"
    assert fetched.content.startswith("# MCP note")
    assert any(item.id == created.id for item in items)
