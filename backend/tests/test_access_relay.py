import hashlib
import hmac

from schemas.access import (
    AccessConnectedHeaders,
    AccessCredentialRecord,
    AccessMode,
    AccessSettings,
    RelayInboundMessage,
)
from services.access import AccessRelay


def test_connected_proxy_proof_covers_signed_headers() -> None:
    headers = {
        "x-locram-access-mode": "connected",
        "x-locram-connected-device-id": "device-one",
        "x-locram-connected-account-session-id": "session-one",
        "x-locram-connected-auth-time": "100",
        "x-locram-connected-amr": "pwd",
        "x-locram-connected-client-id": "client-one",
        "x-locram-connected-audience": "aud",
        "x-locram-connected-cnf-jkt": "jkt",
        "x-locram-connected-resource-class": "mcp",
    }
    connected = AccessConnectedHeaders()
    payload = "\n".join(
        (
            "POST",
            "/mcp",
            *(f"{header_name}:{headers[header_name]}" for header_name in connected.signed_headers),
        )
    )
    expected = hmac.new(b"secret", payload.encode("utf-8"), hashlib.sha256).hexdigest()

    assert connected.proxy_proof("POST", "/mcp", headers, "secret") == expected


def test_forward_headers_add_proof_and_drop_authorization() -> None:
    settings = AccessSettings()
    relay = AccessRelay(settings)
    record = AccessCredentialRecord(
        mode=AccessMode.MANAGED_PUBLIC,
        identity="device-one",
        access_url="https://device-one.locram.app/mcp",
        enrollment_data={"relay_url": "wss://example.test/relay"},
        credential_data={settings.connected_proxy_secret_field: "secret"},
        updated_at=None,
    )
    message = RelayInboundMessage(
        type="proxy_request",
        request_id="req-one",
        method="POST",
        path="/mcp",
        headers={
            "Authorization": "Bearer leak",
            "x-locram-access-mode": "connected",
            "x-locram-connected-device-id": "device-one",
        },
    )
    headers = relay._forward_headers(record, message)
    connected = settings.connected_headers

    assert "Authorization" not in headers
    assert headers[connected.proxy_proof_header] == connected.proxy_proof(
        "POST",
        "/mcp",
        headers,
        "secret",
    )


def test_terminal_errors_and_safe_stop() -> None:
    relay = AccessRelay(AccessSettings())
    relay.stop()

    assert AccessRelay._is_terminal(Exception("HTTP 401")) is True
    assert AccessRelay._is_terminal(Exception("connection reset")) is False
    assert relay.running() is False
