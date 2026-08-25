from fastapi.testclient import TestClient

from schemas.pages import PageCreate, PageType, PageUpdate
from services.links import LinkService
from services.pages import PageService


def test_http_pages_roundtrip(client: TestClient) -> None:
    created = client.post("/api/pages", json={"title": "Hello", "content": "world"})

    assert created.status_code == 201

    page_id = created.json()["item"]["id"]
    listed = client.get("/api/pages?parent_id=root")

    assert listed.status_code == 200
    assert listed.json()["items"][0]["id"] == page_id

    fetched = client.get(f"/api/pages/{page_id}")

    assert fetched.status_code == 200
    assert fetched.json()["item"]["title"] == "Hello"

    updated = client.put(f"/api/pages/{page_id}", json={"title": "Renamed"})

    assert updated.status_code == 200
    assert updated.json()["item"]["title"] == "Renamed"

    deleted = client.delete(f"/api/pages/{page_id}")

    assert deleted.status_code == 200
    assert deleted.json()["deleted"] is True


def test_http_missing_page_is_not_found(client: TestClient) -> None:
    missing = "01MISSINGPAGE00000000000000"

    assert client.get(f"/api/pages/{missing}").status_code == 404
    assert client.put(f"/api/pages/{missing}", json={"title": "Nope"}).status_code == 404
    assert client.delete(f"/api/pages/{missing}").status_code == 404
    assert client.post(f"/api/pages/{missing}/restore").status_code == 404
    assert client.post(f"/api/pages/{missing}/purge").status_code == 404
    assert client.post(f"/api/pages/{missing}/review").status_code == 404
    assert client.post(f"/api/pages/{missing}/promote").status_code == 404
    assert client.get(f"/api/pages/{missing}/ancestry").status_code == 404


def test_http_hub_parent_is_bad_request(client: TestClient) -> None:
    parent = client.post("/api/pages", json={"title": "Root"})
    parent_id = parent.json()["item"]["id"]

    nested = client.post(
        "/api/pages",
        json={"title": "Hub", "type": "hub", "parent_id": parent_id},
    )

    assert nested.status_code == 400
    assert "Hub pages cannot have parent_id" in nested.json()["detail"]


def test_http_restore_and_purge_conflict_when_not_deleted(client: TestClient) -> None:
    created = client.post("/api/pages", json={"title": "Note"})
    page_id = created.json()["item"]["id"]

    assert client.post(f"/api/pages/{page_id}/restore").status_code == 409
    assert client.post(f"/api/pages/{page_id}/purge").status_code == 409

    client.delete(f"/api/pages/{page_id}")
    restored = client.post(f"/api/pages/{page_id}/restore")

    assert restored.status_code == 200
    assert restored.json()["status"] == "active"

    client.delete(f"/api/pages/{page_id}")
    purged = client.post(f"/api/pages/{page_id}/purge")

    assert purged.status_code == 200
    assert purged.json()["purged"] is True
    assert client.get(f"/api/pages/{page_id}").status_code == 404


def test_http_promote_review_search_and_ancestry(
    client: TestClient,
    services: tuple[PageService, LinkService],
) -> None:
    pages, _links = services
    parent = pages.create_page(PageCreate(title="Architecture"))
    child = pages.create_page(
        PageCreate(title="Pages", content="page service", parent_id=parent.id)
    )

    promoted = client.post(f"/api/pages/{child.id}/promote")

    assert promoted.status_code == 200
    assert promoted.json()["new_type"] == "note-taking"

    pages.update_page(parent.id, PageUpdate(type=PageType.PERMANENT))
    blocked = client.post(f"/api/pages/{parent.id}/promote")

    assert blocked.status_code == 400

    reviewed = client.post(f"/api/pages/{child.id}/review")

    assert reviewed.status_code == 200
    assert reviewed.json()["reviewed_at"]

    hits = client.get("/api/pages/search?q=page")

    assert hits.status_code == 200
    assert any(item["id"] == child.id for item in hits.json()["items"])

    empty = client.get("/api/pages/search?q=")

    assert empty.json()["items"] == []

    ancestry = client.get(f"/api/pages/{child.id}/ancestry")

    assert [item["id"] for item in ancestry.json()["items"]] == [parent.id]
