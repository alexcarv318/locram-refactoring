from fastapi.testclient import TestClient


def test_setup_status_writes_mcp_launcher(client: TestClient) -> None:
    response = client.get("/api/setup-status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["desktop_mcp_launcher"] is True
    assert payload["desktop_mcp_launcher_path"].endswith("locram-mcp")
    assert payload["locram_home"]


def test_mcp_tools_catalogue_loads_for_free(client: TestClient) -> None:
    response = client.get("/api/desktop/mcp-tools")

    assert response.status_code == 200
    payload = response.json()
    assert payload["canManage"] is False
    assert payload["edition"]["edition"] == "free"
    assert any(group["family"] == "basic_notes_graph" for group in payload["groups"])
    assert "get_page" in payload["visibleTools"]
    assert "export_subgraph" not in payload["visibleTools"]


def test_free_cannot_manage_mcp_tools(client: TestClient) -> None:
    response = client.patch(
        "/api/desktop/mcp-tools",
        json={"enabledGroups": {"backups_restore": True}},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "EDITION_CAPABILITY_DENIED"


def test_pro_can_manage_mcp_tools(pro_client: TestClient) -> None:
    loaded = pro_client.get("/api/desktop/mcp-tools")

    assert loaded.status_code == 200
    assert loaded.json()["canManage"] is True
    assert "export_subgraph" in loaded.json()["visibleTools"]

    updated = pro_client.patch(
        "/api/desktop/mcp-tools",
        json={"enabledGroups": {"backups_restore": False, "destructive_tools": True}},
    )

    assert updated.status_code == 200
    enabled = {group["family"]: group["enabled"] for group in updated.json()["groups"]}
    assert enabled["backups_restore"] is False
    assert enabled["basic_notes_graph"] is True


def test_user_settings_round_trip(client: TestClient) -> None:
    loaded = client.get("/api/desktop/user-settings")

    assert loaded.status_code == 200
    assert loaded.json()["noteLanguageName"] == "English"
    assert "Japanese" in loaded.json()["noteLanguageOptions"]

    updated = client.patch(
        "/api/desktop/user-settings",
        json={"noteLanguageName": "Japanese"},
    )

    assert updated.status_code == 200
    assert updated.json()["noteLanguageName"] == "Japanese"

    denied = client.patch("/api/desktop/user-settings", json={})

    assert denied.status_code == 400


def test_analytics_track_accepts_event(client: TestClient) -> None:
    response = client.post(
        "/api/desktop/analytics/track",
        json={"event": "settings_opened", "properties": {"tab": "mcp"}},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_logout_and_forget_activation(pro_client: TestClient) -> None:
    logged_out = pro_client.post("/api/desktop/activation/logout")

    assert logged_out.status_code == 200
    assert logged_out.json()["state"] == "signed_out"
    assert logged_out.json()["edition"] == "free"
    assert logged_out.json()["activationRequired"] is True

    forgotten = pro_client.post("/api/desktop/activation/forget")

    assert forgotten.status_code == 200
    assert forgotten.json()["state"] == "free"
    assert forgotten.json()["lastAttempt"] is None
