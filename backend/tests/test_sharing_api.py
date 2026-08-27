from fastapi.testclient import TestClient


def test_http_owner_grant_lifecycle(live_client: TestClient) -> None:
    live_client.get("/api/bases")
    created = live_client.post(
        "/api/base-share-grants",
        json={
            "owner_actor_ref": "device:owner-one",
            "recipient_account_id": "alice",
            "permission": "read",
        },
    )
    grant_id = created.json()["item"]["grant_id"]
    listed = live_client.get(
        "/api/base-share-grants/owner-view",
        params={"owner_actor_ref": "device:owner-one"},
    )
    revoked = live_client.post(
        f"/api/base-share-grants/{grant_id}/revoke",
        json={"revocation_reason": "done"},
    )
    deleted = live_client.post(f"/api/base-share-grants/{grant_id}/delete")

    assert created.status_code == 201
    assert created.json()["item"]["recipient_actor_ref"] == "account:alice"
    assert listed.status_code == 200
    assert listed.json()["items"][0]["grant_id"] == grant_id
    assert listed.json()["items"][0]["grant_state"] == "active"
    assert revoked.status_code == 200
    assert revoked.json()["item"]["revoked_at"] is not None
    assert deleted.status_code == 200
    assert deleted.json() == {"removed": True, "grant_id": grant_id}


def test_http_invite_and_recipient_need_access(live_client: TestClient) -> None:
    live_client.get("/api/bases")
    created = live_client.post(
        "/api/base-share-grants",
        json={
            "owner_actor_ref": "device:owner-one",
            "recipient_actor_ref": "account:alice",
            "permission": "write",
        },
    )
    grant_id = created.json()["item"]["grant_id"]
    invite = live_client.get(f"/api/base-share-grants/{grant_id}/invite")
    recipients = live_client.get(
        "/api/base-share-grants/recipient-view",
        params={"recipient_actor_ref": "account:alice"},
    )
    visibility = live_client.post(
        f"/api/base-share-grants/{grant_id}/mcp-visibility",
        json={"visible_in_mcp": False},
    )
    missing_owner = live_client.get("/api/base-share-grants/owner-view")
    missing_grant = live_client.post("/api/base-share-grants/missing/delete")

    assert invite.status_code == 409
    assert recipients.status_code == 200
    assert recipients.json()["items"] == []
    assert visibility.status_code == 409
    assert missing_owner.status_code == 422
    assert missing_grant.status_code == 404
