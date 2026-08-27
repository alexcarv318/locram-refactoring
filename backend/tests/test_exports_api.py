from fastapi.testclient import TestClient

import database


def test_http_export_list_rename_delete_and_inspect(live_client: TestClient) -> None:
    created_page = live_client.post("/api/pages", json={"title": "Note", "content": "body"})
    page_id = created_page.json()["item"]["id"]
    exported = live_client.post(
        "/api/export",
        json={"page_ids": [page_id], "package_label": "Desk"},
    )
    listed = live_client.get("/api/exports")
    filename = listed.json()["items"][0]["filename"]
    inspected = live_client.post(
        "/api/artifacts/inspect",
        json={"path": exported.json()["item"]["output_path"]},
    )
    ordinary = live_client.post(
        "/api/artifacts/inspect",
        json={"path": str(database.knowledge_path)},
    )
    renamed = live_client.put(
        f"/api/exports/{filename}/rename",
        json={"filename": "desk-export.db"},
    )
    deleted = live_client.delete("/api/exports/desk-export.db")

    assert exported.status_code == 201
    assert exported.json()["item"]["page_count"] == 1
    assert listed.status_code == 200
    assert listed.json()["items"][0]["package_label"] == "Desk"
    assert inspected.status_code == 200
    assert inspected.json()["item"]["artifact_class"] == "scoped_export"
    assert ordinary.status_code == 200
    assert ordinary.json()["item"]["artifact_class"] == "ordinary_base"
    assert renamed.status_code == 200
    assert renamed.json()["item"]["filename"] == "desk-export.db"
    assert deleted.status_code == 200
    assert deleted.json() == {"deleted": True, "filename": "desk-export.db"}


def test_http_export_rejects_empty_scope(live_client: TestClient) -> None:
    response = live_client.post("/api/export", json={})

    assert response.status_code == 400
    assert "page_ids" in response.json()["detail"]
