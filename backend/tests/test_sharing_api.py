from fastapi.testclient import TestClient


def test_http_owner_grant_lifecycle(pro_client: TestClient) -> None:
    pro_client.get("/api/bases")
    created = pro_client.post(
        "/api/base-share-grants",
        json={
            "owner_actor_ref": "device:owner-one",
            "recipient_account_id": "alice",
            "permission": "read",
        },
    )
    grant_id = created.json()["item"]["grant_id"]
    listed = pro_client.get(
        "/api/base-share-grants/owner-view",
        params={"owner_actor_ref": "device:owner-one"},
    )
    revoked = pro_client.post(
        f"/api/base-share-grants/{grant_id}/revoke",
        json={"revocation_reason": "done"},
    )
    deleted = pro_client.post(f"/api/base-share-grants/{grant_id}/delete")

    assert created.status_code == 201
    assert created.json()["item"]["recipient_actor_ref"] == "account:alice"
    assert listed.status_code == 200
    assert listed.json()["items"][0]["grant_id"] == grant_id
    assert listed.json()["items"][0]["grant_state"] == "active"
    assert revoked.status_code == 200
    assert revoked.json()["item"]["revoked_at"] is not None
    assert deleted.status_code == 200
    assert deleted.json() == {"removed": True, "grant_id": grant_id}


def test_http_invite_after_enroll(pro_client: TestClient) -> None:
    pro_client.get("/api/bases")
    created = pro_client.post(
        "/api/base-share-grants",
        json={
            "owner_actor_ref": "device:owner-one",
            "recipient_actor_ref": "account:alice",
            "permission": "write",
        },
    )
    grant_id = created.json()["item"]["grant_id"]
    invite = pro_client.get(f"/api/base-share-grants/{grant_id}/invite")
    missing_grant = pro_client.post("/api/base-share-grants/missing/delete")

    assert created.status_code == 201
    assert invite.status_code == 200
    assert invite.json()["item"]["grant_id"] == grant_id
    assert missing_grant.status_code == 404


def test_http_share_create_requires_pro(live_client: TestClient) -> None:
    live_client.get("/api/bases")
    created = live_client.post(
        "/api/base-share-grants",
        json={
            "owner_actor_ref": "device:owner-one",
            "recipient_account_id": "alice",
            "permission": "read",
        },
    )
    missing_owner = live_client.get("/api/base-share-grants/owner-view")
    missing_grant = live_client.post("/api/base-share-grants/missing/delete")

    assert created.status_code == 403
    assert created.json()["code"] == "EDITION_CAPABILITY_DENIED"
    assert missing_owner.status_code == 422
    assert missing_grant.status_code == 404
