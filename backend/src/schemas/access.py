import hashlib
import hmac
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from schemas.sharing import BaseShareStats, ShareGrantPermission, ShareTransportEnvelope


@dataclass(frozen=True)
class AccessConnectedHeaders:
    access_mode_header: str = "x-locram-access-mode"
    access_mode: str = "connected"
    proxy_proof_header: str = "x-locram-connected-proxy-proof"
    signed_headers: tuple[str, ...] = (
        "x-locram-access-mode",
        "x-locram-connected-device-id",
        "x-locram-connected-account-session-id",
        "x-locram-connected-auth-time",
        "x-locram-connected-amr",
        "x-locram-connected-client-id",
        "x-locram-connected-audience",
        "x-locram-connected-cnf-jkt",
        "x-locram-connected-resource-class",
    )

    def proxy_proof(
        self,
        method: str,
        path: str,
        headers: dict[str, str],
        proxy_secret: str,
    ) -> str:
        lines = [method.upper().strip(), path.strip()]
        normalized = {key.lower(): value.strip() for key, value in headers.items()}

        for header_name in self.signed_headers:
            lines.append(f"{header_name}:{normalized.get(header_name, '')}")

        return hmac.new(
            proxy_secret.encode("utf-8"),
            "\n".join(lines).encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()


@dataclass(frozen=True)
class AccessSettings:
    broker_base_url: str = "https://broker.locram.app"
    local_http_origin: str = "http://127.0.0.1:8757"
    heartbeat_seconds: int = 25
    reconnect_base_seconds: float = 2.0
    broker_timeout_seconds: float = 10.0
    owner_authorization_message_version: str = "locram-managed-public-owner-authorization-v1"
    base_share_invite_message_version: str = "locram-managed-public-base-share-invite-v1"
    connected_proxy_secret_field: str = "connected_proxy_secret"
    connected_headers: AccessConnectedHeaders = field(default_factory=AccessConnectedHeaders)


class AccessMode(StrEnum):
    MANAGED_PUBLIC = "managed_public"


class AccessState(StrEnum):
    ENROLLMENT_REQUIRED = "enrollment_required"
    ENROLLED = "enrolled"
    CONNECTING = "connecting"
    RECONNECTING = "reconnecting"
    LIVE = "live"
    INTERRUPTED = "interrupted"
    UNAVAILABLE = "unavailable"
    REAUTH_REQUIRED = "reauth_required"


class RecoveryAction(StrEnum):
    NONE = "none"
    WAIT = "wait"
    RECONNECT = "reconnect"
    REAUTHENTICATE = "reauthenticate"
    RE_ENROLL = "re_enroll"


class RecoverReactionKind(StrEnum):
    NONE = "none"
    WAIT = "wait"
    RECONNECT_STARTED = "reconnect_started"
    REAUTHENTICATE_REQUIRED = "reauthenticate_required"
    RE_ENROLL_REQUIRED = "re_enroll_required"


class AccessStatus(BaseModel):
    enabled: bool
    mode: AccessMode
    state: AccessState
    enrollment_material_present: bool
    credential_material_present: bool
    runtime_running: bool
    access_url: str | None
    observed_at: str
    identity: str | None
    last_error: str | None
    details: dict[str, str]


class AccessCredentialRecord(BaseModel):
    mode: AccessMode
    identity: str | None
    access_url: str | None
    enrollment_data: dict[str, str]
    credential_data: dict[str, str]
    updated_at: str | None


class AccessSecrets(BaseModel):
    credential_data: dict[str, str]


class AccessRuntimeState(BaseModel):
    mode: AccessMode
    state: AccessState
    observed_at: str
    details: dict[str, str]
    last_error: str | None


class AccountIdentitySummary(BaseModel):
    email: str | None
    display_name: str | None
    account_id: str | None


class AccessSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: AccessStatus
    record: AccessCredentialRecord | None
    runtime_state: AccessRuntimeState | None
    onboarding: dict[str, str]
    account_identity: AccountIdentitySummary | None = Field(
        default=None,
        serialization_alias="accountIdentity",
    )


class AccessIdentitySummary(BaseModel):
    owner_actor_ref: str | None
    recipient_actor_ref: str | None


class AccessRuntimeResult(BaseModel):
    action: str
    pid: int | None
    details: str | None


class AccessRuntimeResponse(BaseModel):
    status: AccessStatus
    runtime_result: AccessRuntimeResult


class RecoveryGuidance(BaseModel):
    recommended_action: RecoveryAction
    available_actions: list[RecoveryAction]
    reconnect_route: str | None = None
    enroll_route: str | None = None
    browser_reauth_available: bool = False
    requires_redemption_code: bool = True


class RecoverReaction(BaseModel):
    kind: RecoverReactionKind


class AccessRecoverResult(BaseModel):
    status: AccessStatus
    recovery: RecoveryGuidance
    reaction: RecoverReaction
    runtime_result: AccessRuntimeResult | None = None


class AccessEnrollRequest(BaseModel):
    redemption_code: str
    broker_base_url: str | None = None
    machine_label: str | None = None


class AccessShareSessionResolveRequest(BaseModel):
    input: str
    expected_broker_base_url: str | None = None


class RelayInboundMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: str
    request_id: str | None = None
    method: str = "POST"
    path: str = "/mcp"
    headers: dict[str, str] = Field(default_factory=dict)
    body_b64: str = ""
    session_id: str | None = None
    credential_version: str | None = None


class RelayProxyResponse(BaseModel):
    type: str = "proxy_response"
    request_id: str
    status: int
    headers: dict[str, str]
    body_b64: str


class RelayStreamMeta(BaseModel):
    type: str = "proxy_stream_meta"
    request_id: str
    status: int
    headers: dict[str, str]


class RelayStreamChunk(BaseModel):
    type: str = "proxy_stream_chunk"
    request_id: str
    chunk_b64: str


class RelayStreamEnd(BaseModel):
    type: str = "proxy_stream_end"
    request_id: str


class RelayHeartbeat(BaseModel):
    type: str = "heartbeat"
    sent_at: str


class InviteMintRequest(BaseModel):
    grant_id: str
    recipient_actor_ref: str
    recipient_account_id: str | None
    share_base_id: str
    share_entry_id: str | None
    share_base_title: str
    permission: ShareGrantPermission
    grant_created_at: str | None
    owner_display_name: str | None
    expires_at: str | None
    message: str | None = None


class PendingAuthorizationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    request_id: str
    device_id: str
    client_id: str
    redirect_uri: str
    resource: str
    code_challenge: str
    code_challenge_method: str
    status: str
    created_at: str
    expires_at: str
    state: str | None = None


class ConnectedOAuthSession(BaseModel):
    model_config = ConfigDict(extra="ignore")

    token_id: str
    client_id: str
    device_id: str
    connector_label: str
    redirect_uri: str
    client_source: str
    client_profile: str
    scope: str
    issued_at: str
    auth_time: str | None = None
    access_expires_at: str
    refresh_expires_at: str | None = None
    amr: str | None = None
    audience: str | None = None
    access_active: bool
    refresh_active: bool
    session_state: str


class BrokerAccountIdentity(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: str | None = None
    display_name: str | None = None
    account_id: str | None = None


class BrokerEnrollResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    device_id: str
    relay_url: str
    relay_token: str
    authorization_server_url: str
    protected_resource_url: str
    public_mcp_url: str | None = None
    public_url: str | None = None
    credential_generation_id: str | None = None
    credential_version: str | None = None
    license_root_id: str | None = None
    license_seat_id: str | None = None
    account_identity: BrokerAccountIdentity | None = None


class BrokerErrorBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    error: str | None = None


class BrokerItemsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[PendingAuthorizationRequest]


class BrokerSessionItemsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[ConnectedOAuthSession]


class BrokerActionResult(BaseModel):
    model_config = ConfigDict(extra="allow")

    status: str | None = None


class ResolvedBaseShareSession(BaseModel):
    session_id: str
    label: str
    state: str
    share_base_id: str
    share_base_title: str
    permission: ShareGrantPermission
    recipient_actor_ref: str
    recipient_account_id: str | None
    broker_base_url: str
    device_id: str
    owner_access_url: str | None = None
    owner_display_name: str | None = None
    share_entry_id: str | None = None
    grant_created_at: str | None = None
    activated_at: str | None = None
    base_stats: BaseShareStats | None = None
    transport_envelope: ShareTransportEnvelope


class AcceptedShareRecord(BaseModel):
    grant_id: str
    share_base_id: str
    share_base_title: str
    permission: ShareGrantPermission
    recipient_actor_ref: str
    recipient_account_id: str | None = None
    owner_actor_ref: str
    owner_display_name: str | None = None
    owner_access_url: str | None = None
    broker_base_url: str
    device_id: str
    share_entry_id: str | None = None
    grant_created_at: str | None = None
    accepted_at: str
    expires_at: str | None = None
    visible_in_mcp: bool = True
    session_state: str = "ready"
    invite_url: str | None = None
    transport_envelope: ShareTransportEnvelope

    def is_available(self, now: datetime) -> bool:
        if not self.visible_in_mcp:
            return False

        if self.session_state == "revoked":
            return False

        if self.expires_at is None:
            return True

        expires_at = datetime.fromisoformat(self.expires_at.replace("Z", "+00:00"))

        return expires_at > now


class AcceptedShareList(BaseModel):
    items: list[AcceptedShareRecord]


class AccessSummaryResponse(BaseModel):
    item: AccessSummary


class AccessIdentityResponse(BaseModel):
    item: AccessIdentitySummary


class AccessRuntimeActionResponse(BaseModel):
    item: AccessRuntimeResponse


class AccessRecoverResponse(BaseModel):
    item: AccessRecoverResult


class PendingAuthorizationListResponse(BaseModel):
    items: list[PendingAuthorizationRequest]


class ConnectedSessionListResponse(BaseModel):
    items: list[ConnectedOAuthSession]


class BrokerActionResponse(BaseModel):
    item: BrokerActionResult


class ResolvedShareSessionResponse(BaseModel):
    item: ResolvedBaseShareSession

