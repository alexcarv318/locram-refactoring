from fastapi.testclient import TestClient

from schemas.pages import PageCreate
from schemas.smart_folders import ORPHANED_SCOPE_ID
from services.pages import PageService


def test_http_preset_lifecycle(client: TestClient) -> None:
    created = client.post(
        "/api/presets",
        json={"name": "Active notes", "filter": {"statuses": ["active"], "searchQuery": ""}},
    )

    assert created.status_code == 201
    preset_id = created.json()["item"]["id"]
    assert created.json()["item"]["filter"]["searchQuery"] == ""

    listed = client.get("/api/presets")
    renamed = client.put(f"/api/presets/{preset_id}", json={"name": "Live notes"})

    assert listed.status_code == 200
    assert listed.json()["items"][0]["id"] == preset_id
    assert renamed.json()["item"]["name"] == "Live notes"

    blank = client.post("/api/presets", json={"name": "  ", "filter": {}})
    missing = client.put("/api/presets/01MISSINGPRESET000000000000", json={"name": "Nope"})
    empty_update = client.put(f"/api/presets/{preset_id}", json={})

    assert blank.status_code == 400
    assert missing.status_code == 404
    assert empty_update.status_code == 400

    deleted = client.delete(f"/api/presets/{preset_id}")

    assert deleted.status_code == 200
    assert deleted.json() == {"deleted": True, "id": preset_id}


def test_http_notes_summaries_and_graphs(
    client: TestClient,
    page_service: PageService,
) -> None:
    page_service.create_page(PageCreate(title="Solo"))

    summaries = client.get("/api/notes/summaries")
    notes_graph = client.get("/api/notes/graph?expand_hops=1")
    orphaned = client.get(f"/api/presets/{ORPHANED_SCOPE_ID}/graph?expand_hops=1")

    assert summaries.status_code == 200
    assert summaries.json()["built_in_counts"][ORPHANED_SCOPE_ID] >= 1
    assert summaries.json()["quick_access_scope_ids"][0] == "builtin-folder-created-today"
    assert notes_graph.status_code == 200
    assert notes_graph.json()["item"]["scope_kind"] == "base"
    assert orphaned.status_code == 200
    assert orphaned.json()["item"]["scope_kind"] == "smart_folder"
    assert any(node["scope_origin"] == "seed" for node in orphaned.json()["item"]["nodes"])
