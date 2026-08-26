from fastapi.testclient import TestClient

from schemas.pages import PageCreate
from services.pages import PageService


def test_data_version_starts_at_zero(live_client: TestClient) -> None:
    response = live_client.get("/api/data-version")

    assert response.status_code == 200
    assert response.json()["item"]["version"] == 0
    assert response.json()["item"]["updated_at"] == ""


def test_page_write_bumps_data_version(live_client: TestClient) -> None:
    before = live_client.get("/api/data-version").json()["item"]["version"]
    created = live_client.post("/api/pages", json={"title": "Fresh", "content": "body"})
    after = live_client.get("/api/data-version").json()["item"]["version"]

    assert created.status_code == 201
    assert after > before


def test_overridden_client_still_serves_data_version(
    client: TestClient,
    page_service: PageService,
) -> None:
    page_service.create_page(PageCreate(title="Ignored by data-version"))
    response = client.get("/api/data-version")

    assert response.status_code == 200
    assert "version" in response.json()["item"]
