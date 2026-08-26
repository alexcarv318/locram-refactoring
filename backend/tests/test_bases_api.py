from pathlib import Path

from fastapi.testclient import TestClient

from services.bases import BaseRegistryService


def test_http_base_lifecycle(client: TestClient, tmp_path: Path) -> None:
    created = client.post(
        "/api/bases/create",
        json={"path": str(tmp_path / "alpha.db"), "display_name": "Alpha", "activate": True},
    )

    assert created.status_code == 201
    entry_id = created.json()["item"]["entry_id"]

    listed = client.get("/api/bases")

    assert listed.status_code == 200
    assert listed.json()["active_base"]["entry_id"] == entry_id
    assert listed.json()["items"][0]["display_name"] == "Alpha"

    other = client.post(
        "/api/bases/create",
        json={"path": str(tmp_path / "beta.db"), "display_name": "Beta", "activate": False},
    )
    other_id = other.json()["item"]["entry_id"]

    switched = client.post(f"/api/bases/{other_id}/switch")
    renamed = client.put(f"/api/bases/{other_id}/rename", json={"display_name": "Beta Two"})
    visibility = client.patch(
        f"/api/bases/{other_id}/mcp-visibility",
        json={"agent_access_mode": "read"},
    )

    assert switched.status_code == 200
    assert switched.json()["item"]["is_active"] is True
    assert renamed.json()["item"]["display_name"] == "Beta Two"
    assert visibility.json()["item"]["agent_access_mode"] == "read"
    assert visibility.json()["item"]["visible_in_mcp"] is True

    blocked = client.post(f"/api/bases/{other_id}/unregister")

    assert blocked.status_code == 409

    removed = client.post(f"/api/bases/{entry_id}/unregister")

    assert removed.status_code == 204


def test_http_register_existing_file(
    client: TestClient,
    base_registry_service: BaseRegistryService,
    tmp_path: Path,
) -> None:
    created = base_registry_service.create(str(tmp_path / "gamma.db"), "Gamma", activate=False)
    registered = client.post(
        "/api/bases/register",
        json={"path": created.path, "activate": False},
    )

    assert registered.status_code == 201
    assert registered.json()["item"]["entry_id"] == created.entry_id


def test_http_base_errors_and_force_delete(client: TestClient, tmp_path: Path) -> None:
    missing = client.post(
        "/api/bases/register",
        json={"path": str(tmp_path / "missing.db"), "activate": False},
    )
    invalid = client.post("/api/bases/create", json={"path": str(tmp_path / "x.db")})
    unknown = client.post("/api/bases/01MISSINGENTRY00000000000000/switch")

    assert missing.status_code == 400
    assert invalid.status_code == 422
    assert unknown.status_code == 404

    active = client.post(
        "/api/bases/create",
        json={"path": str(tmp_path / "active.db"), "display_name": "Active", "activate": True},
    )
    spare = client.post(
        "/api/bases/create",
        json={"path": str(tmp_path / "spare.db"), "display_name": "Spare", "activate": False},
    )
    active_id = active.json()["item"]["entry_id"]
    spare_id = spare.json()["item"]["entry_id"]

    deleted = client.post(f"/api/bases/{active_id}/delete", json={"force": True})
    listed = client.get("/api/bases")

    assert deleted.status_code == 204
    assert listed.json()["active_base"]["entry_id"] == spare_id
