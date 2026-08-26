from fastapi.testclient import TestClient

from schemas.pages import PageCreate
from services.links import LinkService
from services.pages import PageService


def test_http_link_unlink_and_page_projection(
    client: TestClient,
    services: tuple[PageService, LinkService],
) -> None:
    pages, _links = services
    source = pages.create_page(PageCreate(title="Source"))
    target = pages.create_page(PageCreate(title="Target"))

    created = client.post(
        "/api/links",
        json={"source_id": source.id, "target_id": target.id, "link_type": "extends"},
    )

    assert created.status_code == 201
    assert created.json()["created"] is True

    fetched = client.get(f"/api/pages/{source.id}")

    assert fetched.json()["item"]["connected_to"][0]["id"] == target.id
    assert fetched.json()["item"]["connected_to"][0]["link_type"] == "extends"

    duplicate = client.post(
        "/api/links",
        json={"source_id": source.id, "target_id": target.id, "link_type": "extends"},
    )

    assert duplicate.status_code == 201
    assert duplicate.json()["already_exists"] is True

    deleted = client.delete(
        f"/api/links?source_id={source.id}&target_id={target.id}&link_type=extends"
    )

    assert deleted.status_code == 200
    assert client.get(f"/api/pages/{source.id}").json()["item"]["connected_to"] == []


def test_http_link_errors_and_graph(
    client: TestClient,
    services: tuple[PageService, LinkService],
) -> None:
    pages, _links = services
    page = pages.create_page(PageCreate(title="Page"))
    child = pages.create_page(PageCreate(title="Child", parent_id=page.id))

    self_link = client.post(
        "/api/links",
        json={"source_id": page.id, "target_id": page.id, "link_type": "related"},
    )

    assert self_link.status_code == 400

    missing = client.post(
        "/api/links",
        json={
            "source_id": page.id,
            "target_id": "01MISSINGPAGE00000000000000",
            "link_type": "related",
        },
    )

    assert missing.status_code == 404

    graph = client.get(f"/api/pages/{child.id}/graph?expand_hops=1")

    assert graph.status_code == 200
    assert graph.json()["item"]["selected_page_id"] == child.id
    assert any(node["id"] == page.id for node in graph.json()["item"]["nodes"])

    assert client.get("/api/pages/01MISSINGPAGE00000000000000/graph").status_code == 404


def test_http_batch_link(
    client: TestClient,
    services: tuple[PageService, LinkService],
) -> None:
    pages, _links = services
    source = pages.create_page(PageCreate(title="Source"))
    target = pages.create_page(PageCreate(title="Target"))

    result = client.post(
        "/api/links/batch",
        json={
            "links": [
                {
                    "source_id": source.id,
                    "target_id": target.id,
                    "link_type": "related",
                },
                {
                    "source_id": source.id,
                    "target_id": source.id,
                    "link_type": "related",
                },
            ]
        },
    )

    assert result.status_code == 200
    assert result.json()["created"] == 1
    assert len(result.json()["errors"]) == 1


def test_http_unlink_without_type_clears_all_links(
    client: TestClient,
    services: tuple[PageService, LinkService],
) -> None:
    pages, _links = services
    source = pages.create_page(PageCreate(title="Source"))
    target = pages.create_page(PageCreate(title="Target"))

    client.post(
        "/api/links",
        json={"source_id": source.id, "target_id": target.id, "link_type": "extends"},
    )
    client.post(
        "/api/links",
        json={"source_id": source.id, "target_id": target.id, "link_type": "related"},
    )

    deleted = client.delete(f"/api/links?source_id={source.id}&target_id={target.id}")

    assert deleted.status_code == 200
    assert client.get(f"/api/pages/{source.id}").json()["item"]["connected_to"] == []
