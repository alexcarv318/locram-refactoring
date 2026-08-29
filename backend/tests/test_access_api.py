from fastapi.testclient import TestClient

from api.main import app
from dependencies import get_access_service
from services.access import AccessService


def test_http_access_unenrolled(live_client: TestClient) -> None:
    summary = live_client.get("/api/access")
    identity = live_client.get("/api/access/identity")
    recovered = live_client.post("/api/access/recover")
    connect = live_client.post("/api/access/connect")

    assert summary.status_code == 200
    assert summary.json()["item"]["status"]["state"] == "enrollment_required"
    assert identity.status_code == 200
    assert identity.json()["item"]["owner_actor_ref"] is None
    assert recovered.status_code == 200
    assert recovered.json()["item"]["reaction"]["kind"] == "re_enroll_required"
    assert connect.status_code == 200
    assert connect.json()["item"]["runtime_result"]["action"] == "enrollment_required"


def test_http_enroll_and_connect(enrolled_access: AccessService) -> None:
    app.dependency_overrides[get_access_service] = lambda: enrolled_access

    with TestClient(app) as client:
        summary = client.get("/api/access")
        identity = client.get("/api/access/identity")
        connected = client.post("/api/access/connect")
        pending = client.get("/api/access/pending-authorizations")
        sessions = client.get("/api/access/connected-sessions")

    app.dependency_overrides.clear()

    assert summary.status_code == 200
    assert summary.json()["item"]["status"]["state"] == "enrolled"
    assert summary.json()["item"]["record"]["credential_data"] == {}
    assert summary.json()["item"]["accountIdentity"]["email"] == "ada@example.test"
    assert "account_identity" not in summary.json()["item"]
    assert identity.json()["item"]["owner_actor_ref"] == "device:device-one"
    assert connected.status_code == 200
    assert connected.json()["item"]["runtime_result"]["action"] == "started"
    assert pending.status_code == 200
    assert pending.json()["items"] == []
    assert sessions.json()["items"] == []


def test_http_enroll_empty_code(live_client: TestClient) -> None:
    enroll = live_client.post("/api/access/enroll", json={"redemption_code": "  "})

    assert enroll.status_code == 400
