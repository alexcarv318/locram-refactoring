import httpx

import database
from exceptions.access import AccessError
from interfaces.services.access import IAccessRelay
from repositories.access import AccessRepository
from schemas.access import (
    AccessCredentialRecord,
    AccessEnrollRequest,
    AccessShareSessionResolveRequest,
    AccessState,
    BrokerEnrollResponse,
    BrokerLeaseRefreshResponse,
    InviteMintRequest,
    SignedEntitlementLease,
)
from schemas.sharing import ShareGrantPermission
from services.access import AccessService
from tests.entitlement import TEST_ACCESS_SETTINGS, signed_entitlement_lease


class _QuietRelay(IAccessRelay):
    def start(self, record: AccessCredentialRecord) -> None:
        return None

    def stop(self) -> None:
        return None

    def running(self) -> bool:
        return False

    def state(self) -> AccessState:
        return AccessState.UNAVAILABLE

    def last_error(self) -> str | None:
        return None


class _ActivationHttp:
    def __init__(self, entitlement_lease: SignedEntitlementLease | None = None) -> None:
        self.posts: list[str] = []
        self.entitlement_lease = (
            signed_entitlement_lease() if entitlement_lease is None else entitlement_lease
        )
        self.enroll_status = 200
        self.enroll_body: dict[str, str | int | dict[str, str]] = {
            "device_id": "device-one",
            "relay_url": "wss://broker.example.test/relay",
            "relay_token": "relay-token",
            "authorization_server_url": "https://broker.example.test",
            "protected_resource_url": "https://device-one.locram.app/mcp",
            "public_mcp_url": "https://device-one.locram.app/mcp",
            "account_identity": {
                "email": "ada@example.test",
                "display_name": "Ada",
                "account_id": "acct-one",
            },
        }
        self.redeem_body: dict[str, str | bool | int] = {
            "activation_session_id": "session-one",
            "status": "pending",
            "expires_at": 2000000000,
        }

    def get(
        self,
        url: str,
        *,
        params: dict[str, str] | None = None,
        headers: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response:
        return httpx.Response(404, json={"error": "missing"})

    def post(
        self,
        url: str,
        *,
        json: dict[str, str] | None = None,
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
        params: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response:
        self.posts.append(url)

        if url.endswith("/v1/activation/sessions"):
            return httpx.Response(
                200,
                json={
                    "activation_session_id": "session-one",
                    "activation_secret": "secret-one",
                    "approval_url": "https://app.locram.app/activate?session=session-one",
                    "expires_at": 2000000000,
                },
            )

        if url.endswith("/redeem"):
            return httpx.Response(200, json=self.redeem_body)

        if url.endswith("/api/devices/enroll"):
            if self.enroll_status >= 400:
                return httpx.Response(self.enroll_status, json=self.enroll_body)

            enrolled = BrokerEnrollResponse.model_validate(self.enroll_body).model_copy(
                update={"entitlement_lease": self.entitlement_lease}
            )

            return httpx.Response(
                self.enroll_status,
                text=enrolled.model_dump_json(exclude_none=True),
            )

        if url.endswith("/api/devices/lease/refresh"):
            return httpx.Response(
                200,
                text=BrokerLeaseRefreshResponse(
                    status="refreshed",
                    entitlement_lease=self.entitlement_lease,
                ).model_dump_json(exclude_none=True),
            )

        return httpx.Response(200, json={"status": "ok"})


def test_summary_and_identity_are_unenrolled(access_service: AccessService) -> None:
    summary = access_service.summary()
    identity = access_service.identity()

    assert summary.status.state is AccessState.ENROLLMENT_REQUIRED
    assert summary.status.enrollment_material_present is False
    assert summary.record is None
    assert summary.onboarding["enroll_route"] == "/api/access/enroll"
    assert identity.owner_actor_ref is None
    assert identity.recipient_actor_ref is None


def test_recover_asks_to_enroll(access_service: AccessService) -> None:
    recovered = access_service.recover()

    assert recovered.reaction.kind.value == "re_enroll_required"
    assert recovered.recovery.recommended_action.value == "re_enroll"


def test_enroll_persists_public_record_without_secrets(enrolled_access: AccessService) -> None:
    summary = enrolled_access.summary()
    identity = enrolled_access.identity()
    public_text = database.access_path.read_text()
    secrets_text = database.access_credentials_path.read_text()

    assert summary.status.state is AccessState.ENROLLED
    assert summary.status.enrollment_material_present is True
    assert summary.status.credential_material_present is True
    assert summary.record is not None
    assert summary.record.credential_data == {}
    assert summary.account_identity is not None
    assert summary.account_identity.email == "ada@example.test"
    assert identity.owner_actor_ref == "device:device-one"
    assert identity.recipient_actor_ref == "account:acct-one"
    assert "relay-token" not in public_text
    assert "BEGIN PRIVATE KEY" not in public_text
    assert "relay-token" in secrets_text


def test_enroll_rejects_empty_code(access_service: AccessService) -> None:
    try:
        access_service.enroll(AccessEnrollRequest(redemption_code="  "))
    except AccessError as error:
        assert str(error) == "redemption_code is required"
    else:
        raise AssertionError("expected AccessError")


def test_connect_and_recover_after_enroll(enrolled_access: AccessService) -> None:
    connected = enrolled_access.connect()
    recovered = enrolled_access.recover()
    disconnected = enrolled_access.disconnect()

    assert connected.runtime_result.action == "started"
    assert connected.status.runtime_running is True
    assert connected.status.state is AccessState.LIVE
    assert recovered.reaction.kind.value == "none"
    assert disconnected.runtime_result.action == "stopped"


def test_connect_without_enrollment_does_not_raise(access_service: AccessService) -> None:
    connected = access_service.connect()

    assert connected.runtime_result.action == "enrollment_required"


def test_pending_sessions_and_invite_after_enroll(
    enrolled_access_with_pending: AccessService,
) -> None:
    pending = enrolled_access_with_pending.list_pending_authorizations()
    approved = enrolled_access_with_pending.approve_pending_authorization("req-one")
    sessions = enrolled_access_with_pending.list_connected_sessions()
    invite = enrolled_access_with_pending.mint_invite(
        InviteMintRequest(
            grant_id="grant-one",
            recipient_actor_ref="account:alice",
            recipient_account_id="alice",
            share_base_id="base-one",
            share_entry_id=None,
            share_base_title="Notes",
            permission=ShareGrantPermission.READ,
            grant_created_at="2026-01-01T00:00:00Z",
            owner_display_name="Ada",
            expires_at=None,
        )
    )

    assert pending[0].request_id == "req-one"
    assert approved.status == "ok"
    assert sessions == []
    assert invite.share_invite_url.startswith("https://broker.example.test/public-app/base-share?")
    assert "owner_proof=" in invite.share_invite_url


def test_resolve_share_session_persists_accepted_share(enrolled_access: AccessService) -> None:
    invite = enrolled_access.mint_invite(
        InviteMintRequest(
            grant_id="grant-one",
            recipient_actor_ref="account:alice",
            recipient_account_id="alice",
            share_base_id="base-one",
            share_entry_id=None,
            share_base_title="Notes",
            permission=ShareGrantPermission.READ,
            grant_created_at="2026-01-01T00:00:00Z",
            owner_display_name="Ada",
            expires_at=None,
        )
    )
    resolved = enrolled_access.resolve_share_session(
        AccessShareSessionResolveRequest(input=invite.share_invite_url)
    )
    shares = enrolled_access.list_accepted_shares()

    assert resolved.share_base_title == "Notes"
    assert resolved.state == "ready"
    assert len(shares) == 1
    assert shares[0].grant_id == "grant-one"


class UnreachableAccessHttp:
    def get(
        self,
        url: str,
        *,
        params: dict[str, str] | None = None,
        headers: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response:
        raise httpx.ConnectError("offline")

    def post(
        self,
        url: str,
        *,
        json: dict[str, str] | None = None,
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
        params: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response:
        raise httpx.ConnectError("offline")


def test_broker_network_error_is_access_error(enrolled_access: AccessService) -> None:
    enrolled_access._http_client = UnreachableAccessHttp()

    try:
        enrolled_access.list_pending_authorizations()
    except AccessError as error:
        assert error.status_code == 502
    else:
        raise AssertionError("expected AccessError")


def test_desktop_activation_starts_pending_product_session(
    access_service: AccessService,
) -> None:
    started = access_service.start_or_continue_desktop_activation("Alex Mac")
    again = access_service.start_or_continue_desktop_activation(None)

    assert started.state == "not_activated"
    assert started.last_attempt is not None
    assert started.last_attempt.state == "pending"
    assert started.last_attempt.approval_url is not None
    assert "activate" in started.last_attempt.approval_url
    assert started.last_attempt.activation_session_id == "session-one"
    assert again.last_attempt is not None
    assert again.last_attempt.state == "pending"
    assert again.last_attempt.activation_session_id == "session-one"


def test_desktop_activation_enrolls_after_redeem() -> None:
    http_client = _ActivationHttp()
    access_service = AccessService(
        access_repository=AccessRepository(
            database.access_path,
            database.access_credentials_path,
            database.accepted_shares_path,
        ),
        access_relay=_QuietRelay(),
        http_client=http_client,
        settings=TEST_ACCESS_SETTINGS,
    )
    access_service.start_or_continue_desktop_activation(None)
    http_client.redeem_body = {
        "activation_session_id": "session-one",
        "status": "redeemed",
        "requires_broker_enrollment": True,
        "broker_enrollment_token": "entitlement-one",
        "broker_enroll_url": "https://broker.example.test/api/devices/enroll",
    }
    completed = access_service.start_or_continue_desktop_activation(None)
    identity = access_service.summary().account_identity

    assert completed.state == "active"
    assert completed.edition == "pro"
    assert completed.activation_required is False
    assert completed.last_attempt is not None
    assert completed.last_attempt.state == "succeeded"
    assert identity is not None
    assert identity.email == "ada@example.test"
    assert any(url.endswith("/api/devices/enroll") for url in http_client.posts)


def test_desktop_activation_keeps_pending_transfer_then_enrolls() -> None:
    http_client = _ActivationHttp()
    http_client.enroll_status = 409
    http_client.enroll_body = {
        "error": "transfer_required",
        "transfer_session_id": "transfer-one",
    }
    access_service = AccessService(
        access_repository=AccessRepository(
            database.access_path,
            database.access_credentials_path,
            database.accepted_shares_path,
        ),
        access_relay=_QuietRelay(),
        http_client=http_client,
        settings=TEST_ACCESS_SETTINGS,
    )
    access_service.start_or_continue_desktop_activation(None)
    http_client.redeem_body = {
        "activation_session_id": "session-one",
        "status": "redeemed",
        "requires_broker_enrollment": True,
        "broker_enrollment_token": "entitlement-one",
        "broker_enroll_url": "https://broker.example.test/api/devices/enroll",
    }
    waiting = access_service.start_or_continue_desktop_activation(None)

    assert waiting.last_attempt is not None
    assert waiting.last_attempt.state == "pending"
    assert waiting.last_attempt.error_code == "transfer_required"
    assert waiting.last_attempt.transfer_session_id == "transfer-one"
    assert waiting.last_attempt.approval_url is not None
    assert "activation_transfer" in waiting.last_attempt.approval_url

    http_client.enroll_body = {
        "error": "transfer_required",
        "transfer_session_id": "transfer-two",
    }
    updated = access_service.start_or_continue_desktop_activation(None)

    assert updated.last_attempt is not None
    assert updated.last_attempt.transfer_session_id == "transfer-two"
    assert updated.last_attempt.approval_url is not None
    assert "transfer-two" in updated.last_attempt.approval_url

    http_client.enroll_status = 200
    http_client.enroll_body = {
        "device_id": "device-one",
        "relay_url": "wss://broker.example.test/relay",
        "relay_token": "relay-token",
        "authorization_server_url": "https://broker.example.test",
        "protected_resource_url": "https://device-one.locram.app/mcp",
        "public_mcp_url": "https://device-one.locram.app/mcp",
        "credential_version": 1,
        "account_identity": {
            "email": "ada@example.test",
            "display_name": "Ada",
            "account_id": "acct-one",
        },
    }
    completed = access_service.start_or_continue_desktop_activation(None)
    identity = access_service.summary().account_identity

    assert completed.state == "active"
    assert completed.edition == "pro"
    assert completed.last_attempt is not None
    assert completed.last_attempt.state == "succeeded"
    assert identity is not None
    assert identity.email == "ada@example.test"


def test_desktop_activation_raises_when_product_api_is_down(
    access_service: AccessService,
) -> None:
    access_service._http_client = UnreachableAccessHttp()

    try:
        access_service.start_or_continue_desktop_activation(None)
    except AccessError as error:
        assert error.status_code == 502
        assert "Product API" in str(error)
    else:
        raise AssertionError("expected AccessError")


def test_empty_code_and_missing_invite_input(access_service: AccessService) -> None:
    try:
        access_service.resolve_share_session(AccessShareSessionResolveRequest(input="  "))
    except AccessError as error:
        assert str(error) == "input is required"
    else:
        raise AssertionError("expected AccessError")
