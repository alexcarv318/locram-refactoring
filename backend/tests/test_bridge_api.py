from pathlib import Path

from fastapi.testclient import TestClient

import database
from services.bases import BaseRegistryService


def test_http_health(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_http_runtime_includes_active_base(
    client: TestClient,
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    created = base_registry_service.create(str(tmp_path / "notes.db"), "Notes", activate=True)
    response = client.get("/api/runtime")

    assert response.status_code == 200
    assert response.json()["locram_home"] == str(database.host_state_path.parent)
    assert response.json()["db_path"] == created.path
    assert response.json()["active_base"]["entry_id"] == created.entry_id
    assert response.json()["active_base"]["display_name"] == "Notes"


def test_http_session_bootstrap_includes_active_base_and_version(
    client: TestClient,
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    created = base_registry_service.create(str(tmp_path / "notes.db"), "Notes", activate=True)
    response = client.get("/api/session/bootstrap")

    assert response.status_code == 200
    assert response.json()["db_path"] == created.path
    assert response.json()["active_base"]["entry_id"] == created.entry_id
    assert response.json()["data_version"]["version"] >= 0


def test_http_desktop_activation_is_unsigned_when_empty(client: TestClient) -> None:
    response = client.get("/api/desktop/activation")

    assert response.status_code == 200
    assert response.json()["state"] == "free"
    assert response.json()["activationRequired"] is True
    assert response.json()["productName"] == "Locram"
    assert response.json()["lastAttempt"] is None
