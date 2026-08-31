import httpx

import database
from exceptions.access import AccessError
from schemas.access import (
    AccessEnrollRequest,
    AccessShareSessionResolveRequest,
    AccessState,
    InviteMintRequest,
)
from schemas.sharing import ShareGrantPermission
from services.access import AccessService


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


def test_empty_code_and_missing_invite_input(access_service: AccessService) -> None:
    try:
        access_service.resolve_share_session(AccessShareSessionResolveRequest(input="  "))
    except AccessError as error:
        assert str(error) == "input is required"
    else:
        raise AssertionError("expected AccessError")
