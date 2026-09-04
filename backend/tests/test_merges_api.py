from fastapi.testclient import TestClient


def test_http_merge_plan_and_execute(pro_client: TestClient) -> None:
    first = pro_client.post("/api/pages", json={"title": "Alpha", "content": "first"})
    second = pro_client.post("/api/pages", json={"title": "Beta", "content": "second"})
    first_id = first.json()["item"]["id"]
    second_id = second.json()["item"]["id"]
    exported = pro_client.post("/api/export", json={"page_ids": [first_id, second_id]})
    pro_client.delete(f"/api/pages/{second_id}")
    pro_client.post(f"/api/pages/{second_id}/purge")
    export_path = exported.json()["item"]["output_path"]
    plan = pro_client.post("/api/merges/plan", json={"path": export_path})
    outcome = pro_client.post(
        "/api/merges/execute",
        json={"path": exported.json()["item"]["output_path"]},
    )
    restored = pro_client.get(f"/api/pages/{second_id}")

    assert plan.status_code == 200
    assert plan.json()["item"]["new_page_count"] == 1
    assert outcome.status_code == 200
    assert outcome.json()["item"]["inserted_page_count"] == 1
    assert "-pre_merge-" in outcome.json()["item"]["backup_filename"]
    assert restored.status_code == 200
    assert restored.json()["item"]["title"] == "Beta"
