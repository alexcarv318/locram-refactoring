from fastapi.testclient import TestClient


def test_http_backup_create_list_rename_delete(live_client: TestClient) -> None:
    live_client.post("/api/pages", json={"title": "Note", "content": "body"})
    created = live_client.post("/api/backups", json={"trigger": "manual"})
    listed = live_client.get("/api/backups")
    filename = created.json()["item"]["filename"]
    renamed = live_client.put(
        f"/api/backups/{filename}/rename",
        json={"filename": "locram-renamed-20260101T000000Z.db"},
    )
    deleted = live_client.delete("/api/backups/locram-renamed-20260101T000000Z.db")

    assert created.status_code == 201
    assert created.json()["item"]["trigger"] == "manual"
    assert listed.status_code == 200
    assert listed.json()["items"][0]["filename"] == filename
    assert renamed.status_code == 200
    assert renamed.json()["item"]["filename"] == "locram-renamed-20260101T000000Z.db"
    assert deleted.status_code == 200
    assert deleted.json() == {
        "deleted": True,
        "filename": "locram-renamed-20260101T000000Z.db",
    }


def test_http_restore_returns_pre_restore_backup(live_client: TestClient) -> None:
    live_client.post("/api/pages", json={"title": "Note", "content": "body"})
    created = live_client.post("/api/backups", json={"trigger": "manual"})
    filename = created.json()["item"]["filename"]
    restored = live_client.post("/api/backups/restore", json={"filename": filename})

    assert restored.status_code == 200
    assert restored.json()["item"]["restored_from"] == filename
    assert restored.json()["item"]["pre_restore_backup"].startswith("locram-pre_restore-")
