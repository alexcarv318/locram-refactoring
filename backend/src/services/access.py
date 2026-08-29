import asyncio
import base64
import json
import platform
import secrets
import threading
from datetime import UTC, datetime
from urllib.parse import parse_qs, urlencode, urlparse

import httpx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from pydantic import ValidationError
from websockets.asyncio.client import ClientConnection, connect

from exceptions.access import AccessError
from interfaces.repositories.access import IAccessRepository
from interfaces.services.access import AccessHttpClient, IAccessRelay, IAccessService
from schemas.access import (
    AcceptedShareRecord,
    AccessCredentialRecord,
    AccessEnrollRequest,
    AccessIdentitySummary,
    AccessMode,
    AccessRecoverResult,
    AccessRuntimeResponse,
    AccessRuntimeResult,
    AccessRuntimeState,
    AccessSettings,
    AccessShareSessionResolveRequest,
    AccessState,
    AccessStatus,
    AccessSummary,
    AccountIdentitySummary,
    BrokerActionResult,
    BrokerEnrollResponse,
    BrokerErrorBody,
    BrokerItemsResponse,
    BrokerSessionItemsResponse,
    ConnectedOAuthSession,
    InviteMintRequest,
    PendingAuthorizationRequest,
    RecoverReaction,
    RecoverReactionKind,
    RecoveryAction,
    RecoveryGuidance,
    RelayHeartbeat,
    RelayInboundMessage,
    RelayProxyResponse,
    RelayStreamChunk,
    RelayStreamEnd,
    RelayStreamMeta,
    ResolvedBaseShareSession,
)
from schemas.sharing import ShareGrantPermission, ShareInvite, ShareTransportEnvelope


class AccessRelay(IAccessRelay):
    def __init__(self, settings: AccessSettings) -> None:
        self._settings = settings
        self._thread: threading.Thread | None = None
        self._stop_event: asyncio.Event | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._state = AccessState.UNAVAILABLE
        self._last_error: str | None = None
        self._record: AccessCredentialRecord | None = None
        self._local_http_origin = settings.local_http_origin.rstrip("/")
        self._lock = threading.Lock()

    def start(self, record: AccessCredentialRecord) -> None:
        with self._lock:
            if self._thread is not None and self._thread.is_alive():
                return

            self._record = record
            self._last_error = None
            self._state = AccessState.CONNECTING
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()

    def stop(self) -> None:
        with self._lock:
            loop = self._loop
            stop_event = self._stop_event
            thread = self._thread

        if loop is not None and stop_event is not None and loop.is_running():
            loop.call_soon_threadsafe(stop_event.set)

        if thread is not None:
            thread.join(timeout=5)

        with self._lock:
            if thread is not None and thread.is_alive():
                return

            if self._thread is not thread:
                return

            self._thread = None
            self._loop = None
            self._stop_event = None
            self._state = AccessState.UNAVAILABLE

    def running(self) -> bool:
        thread = self._thread
        return thread is not None and thread.is_alive()

    def state(self) -> AccessState:
        return self._state

    def last_error(self) -> str | None:
        return self._last_error

    def _run_loop(self) -> None:
        asyncio.run(self._run())

    async def _run(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._stop_event = asyncio.Event()
        record = self._record
        attempt = 0

        if record is None:
            self._state = AccessState.UNAVAILABLE
            self._last_error = "Enrollment is required before connect."
            return

        while not self._stop_event.is_set():
            attempt += 1
            self._state = AccessState.CONNECTING if attempt == 1 else AccessState.RECONNECTING

            try:
                await self._run_session(record)
                attempt = 0
            except Exception as error:
                if self._is_terminal(error):
                    self._state = AccessState.UNAVAILABLE
                    self._last_error = str(error)
                    return

                self._state = AccessState.INTERRUPTED
                self._last_error = str(error)
                await asyncio.sleep(
                    self._settings.reconnect_base_seconds * (2 ** (min(attempt, 5) - 1))
                )

        self._state = AccessState.UNAVAILABLE

    async def _run_session(self, record: AccessCredentialRecord) -> None:
        relay_url = record.enrollment_data.get("relay_url", "")
        relay_token = record.credential_data.get("relay_token", "")

        if relay_url == "" or relay_token == "":
            raise AccessError("Relay credentials are missing")

        async with connect(
            relay_url,
            additional_headers={"Authorization": f"Bearer {relay_token}"},
            ping_interval=None,
        ) as websocket:
            self._state = AccessState.LIVE
            self._last_error = None
            heartbeat = asyncio.create_task(self._send_heartbeats(websocket))

            try:
                async for raw_message in websocket:
                    if self._stop_event is not None and self._stop_event.is_set():
                        return

                    text = (
                        raw_message.decode("utf-8")
                        if type(raw_message) is bytes
                        else str(raw_message)
                    )

                    try:
                        message = RelayInboundMessage.model_validate_json(text)
                    except ValidationError:
                        continue

                    await self._handle_message(websocket, record, message)
            finally:
                heartbeat.cancel()

    async def _send_heartbeats(self, websocket: ClientConnection) -> None:
        while self._stop_event is None or not self._stop_event.is_set():
            await asyncio.sleep(self._settings.heartbeat_seconds)
            await websocket.send(
                RelayHeartbeat(sent_at=datetime.now(UTC).isoformat()).model_dump_json()
            )

    async def _handle_message(
        self,
        websocket: ClientConnection,
        record: AccessCredentialRecord,
        message: RelayInboundMessage,
    ) -> None:
        if message.type == "ping":
            await websocket.send(json.dumps({"type": "pong"}))
            return

        if message.type == "relay_session_started":
            self._state = AccessState.LIVE
            return

        if message.type != "proxy_request" or message.request_id is None:
            return

        if message.method.upper() == "GET":
            await self._forward_stream(websocket, record, message)
            return

        response = await self._forward_buffered(record, message)
        await websocket.send(response.model_dump_json())

    async def _forward_buffered(
        self,
        record: AccessCredentialRecord,
        message: RelayInboundMessage,
    ) -> RelayProxyResponse:
        headers = self._forward_headers(record, message)
        body = base64.b64decode(message.body_b64) if message.body_b64 != "" else b""
        url = f"{self._local_http_origin}{message.path}"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.request(
                    message.method.upper(),
                    url,
                    headers=headers,
                    content=body,
                )
        except httpx.RequestError as error:
            return RelayProxyResponse(
                request_id=message.request_id or "",
                status=502,
                headers={"content-type": "application/json"},
                body_b64=base64.b64encode(
                    json.dumps({"error": f"local mcp relay failed: {error}"}).encode()
                ).decode("ascii"),
            )

        response_headers = {
            key: value
            for key, value in response.headers.items()
            if key.lower()
            not in {"connection", "content-length", "transfer-encoding", "content-encoding"}
        }

        return RelayProxyResponse(
            request_id=message.request_id or "",
            status=response.status_code,
            headers=response_headers,
            body_b64=base64.b64encode(response.content).decode("ascii"),
        )

    async def _forward_stream(
        self,
        websocket: ClientConnection,
        record: AccessCredentialRecord,
        message: RelayInboundMessage,
    ) -> None:
        request_id = message.request_id or ""
        headers = self._forward_headers(record, message)
        url = f"{self._local_http_origin}{message.path}"

        try:
            async with (
                httpx.AsyncClient(timeout=httpx.Timeout(30.0, read=None)) as client,
                client.stream("GET", url, headers=headers) as response,
            ):
                response_headers = {
                    key: value
                    for key, value in response.headers.items()
                    if key.lower()
                    not in {
                        "connection",
                        "content-length",
                        "transfer-encoding",
                        "content-encoding",
                    }
                }
                await websocket.send(
                    RelayStreamMeta(
                        request_id=request_id,
                        status=response.status_code,
                        headers=response_headers,
                    ).model_dump_json()
                )

                async for chunk in response.aiter_bytes(chunk_size=65_536):
                    if chunk:
                        await websocket.send(
                            RelayStreamChunk(
                                request_id=request_id,
                                chunk_b64=base64.b64encode(chunk).decode("ascii"),
                            ).model_dump_json()
                        )

                await websocket.send(RelayStreamEnd(request_id=request_id).model_dump_json())
        except httpx.RequestError as error:
            await websocket.send(
                RelayProxyResponse(
                    request_id=request_id,
                    status=502,
                    headers={"content-type": "application/json"},
                    body_b64=base64.b64encode(
                        json.dumps({"error": f"local mcp relay failed: {error}"}).encode()
                    ).decode("ascii"),
                ).model_dump_json()
            )

    def _forward_headers(
        self,
        record: AccessCredentialRecord,
        message: RelayInboundMessage,
    ) -> dict[str, str]:
        headers = {
            key: value
            for key, value in message.headers.items()
            if key.lower() not in {"authorization", "connection", "content-length", "host"}
        }
        headers["Accept"] = "application/json, text/event-stream"
        connected = self._settings.connected_headers
        access_mode = ""

        for key, value in headers.items():
            if key.lower() == connected.access_mode_header:
                access_mode = value

        if access_mode == connected.access_mode:
            proxy_secret = record.credential_data.get(
                self._settings.connected_proxy_secret_field,
                "",
            )
            headers[connected.proxy_proof_header] = connected.proxy_proof(
                message.method,
                message.path,
                headers,
                proxy_secret,
            )

        return headers

    @staticmethod
    def _is_terminal(error: Exception) -> bool:
        lowered = str(error).lower()
        return any(
            marker in lowered
            for marker in (
                "http 401",
                "http 403",
                "invalid token",
                "invalid_token",
                "unauthorized",
                "forbidden",
            )
        )


class AccessService(IAccessService):
    def __init__(
        self,
        access_repository: IAccessRepository,
        access_relay: IAccessRelay,
        http_client: AccessHttpClient,
        settings: AccessSettings,
    ) -> None:
        self._access_repository = access_repository
        self._access_relay = access_relay
        self._http_client = http_client
        self._settings = settings

    def summary(self) -> AccessSummary:
        record = self._access_repository.load()
        status = self._status(record)
        public_record = self._public_record(record)

        return AccessSummary(
            status=status,
            record=public_record,
            runtime_state=self._runtime_state(status),
            onboarding=self._onboarding(record),
            account_identity=self._account_identity(record),
        )

    def identity(self) -> AccessIdentitySummary:
        record = self._access_repository.load()

        if record is None or record.identity is None:
            return AccessIdentitySummary(owner_actor_ref=None, recipient_actor_ref=None)

        owner_actor_ref = self._typed_actor_ref(record.identity, "device:")
        account_id = record.enrollment_data.get("account_id", "").strip()
        recipient_actor_ref = f"account:{account_id}" if account_id != "" else None

        return AccessIdentitySummary(
            owner_actor_ref=owner_actor_ref,
            recipient_actor_ref=recipient_actor_ref,
        )

    def enroll(self, payload: AccessEnrollRequest) -> AccessSummary:
        redemption_code = payload.redemption_code.strip()

        if redemption_code == "":
            raise AccessError("redemption_code is required")

        broker_base_url = (payload.broker_base_url or self._settings.broker_base_url).rstrip("/")
        public_key, private_key_pem = self.generate_device_keys()
        machine_label = (payload.machine_label or "").strip() or platform.node()
        request_body = {
            "client_public_key": public_key,
            "key_algorithm": "ed25519",
            "requested_mode": AccessMode.MANAGED_PUBLIC.value,
            "redemption_code": redemption_code,
        }

        if machine_label != "":
            request_body["machine_label"] = machine_label

        response = self._http_post(f"{broker_base_url}/api/devices/enroll", request_body)

        if response.status_code >= 400:
            raise self._enroll_error(response)

        try:
            enrolled = BrokerEnrollResponse.model_validate_json(response.text)
        except ValidationError as error:
            raise AccessError(
                "Activation broker returned an invalid enrollment response"
            ) from error

        access_url = enrolled.public_mcp_url or enrolled.public_url

        if access_url is None or access_url.strip() == "":
            raise AccessError("Activation broker did not return a public access URL")

        enrollment_data = {
            "broker_base_url": broker_base_url,
            "auth_server_url": enrolled.authorization_server_url,
            "authorization_server_url": enrolled.authorization_server_url,
            "protected_resource_url": enrolled.protected_resource_url,
            "relay_url": enrolled.relay_url,
        }
        optional_enrollment = {
            "credential_generation_id": enrolled.credential_generation_id,
            "credential_version": enrolled.credential_version,
            "license_root_id": enrolled.license_root_id,
            "license_seat_id": enrolled.license_seat_id,
        }

        for field_name, field_value in optional_enrollment.items():
            if field_value is not None and field_value.strip() != "":
                enrollment_data[field_name] = field_value.strip()

        if enrolled.account_identity is not None:
            if enrolled.account_identity.email:
                enrollment_data["account_email"] = enrolled.account_identity.email.strip()

            if enrolled.account_identity.display_name:
                enrollment_data["account_display_name"] = (
                    enrolled.account_identity.display_name.strip()
                )

            if enrolled.account_identity.account_id:
                enrollment_data["account_id"] = enrolled.account_identity.account_id.strip()

        record = AccessCredentialRecord(
            mode=AccessMode.MANAGED_PUBLIC,
            identity=enrolled.device_id,
            access_url=access_url,
            enrollment_data=enrollment_data,
            credential_data={
                "relay_token": enrolled.relay_token,
                self._settings.connected_proxy_secret_field: secrets.token_urlsafe(32),
                "client_private_key_pem": private_key_pem,
                "client_public_key": public_key,
                "key_algorithm": "ed25519",
            },
            updated_at=self._now(),
        )
        self._access_repository.save(record)
        return self.summary()

    def connect(self) -> AccessRuntimeResponse:
        record = self._access_repository.load()

        if record is None:
            return self._runtime_response(
                "enrollment_required",
                "Enrollment is required before connect.",
            )

        if not self._has_credentials(record):
            return self._runtime_response(
                "reauth_required",
                "Sign in again to restore this desktop session.",
            )

        if self._access_relay.running():
            return self._runtime_response("already_running", None)

        self._access_relay.start(record)
        return self._runtime_response("started", None)

    def reconnect(self) -> AccessRuntimeResponse:
        record = self._access_repository.load()

        if record is None:
            return self._runtime_response(
                "enrollment_required",
                "Enrollment is required before reconnect.",
            )

        if not self._has_credentials(record):
            return self._runtime_response(
                "reauth_required",
                "Sign in again to restore this desktop session.",
            )

        self._access_relay.stop()
        self._access_relay.start(record)
        return self._runtime_response("restarted", None)

    def disconnect(self) -> AccessRuntimeResponse:
        self._access_relay.stop()
        return self._runtime_response("stopped", None)

    def recover(self) -> AccessRecoverResult:
        record = self._access_repository.load()
        status = self._status(record)

        if record is None:
            return AccessRecoverResult(
                status=status,
                recovery=RecoveryGuidance(
                    recommended_action=RecoveryAction.RE_ENROLL,
                    available_actions=[RecoveryAction.RE_ENROLL],
                    enroll_route="/api/access/enroll",
                    requires_redemption_code=True,
                ),
                reaction=RecoverReaction(kind=RecoverReactionKind.RE_ENROLL_REQUIRED),
            )

        if not self._has_credentials(record):
            return AccessRecoverResult(
                status=status,
                recovery=RecoveryGuidance(
                    recommended_action=RecoveryAction.REAUTHENTICATE,
                    available_actions=[RecoveryAction.REAUTHENTICATE, RecoveryAction.RECONNECT],
                    reconnect_route="/api/access/reconnect",
                    browser_reauth_available=True,
                    requires_redemption_code=False,
                ),
                reaction=RecoverReaction(kind=RecoverReactionKind.REAUTHENTICATE_REQUIRED),
            )

        if status.state in {AccessState.CONNECTING, AccessState.RECONNECTING}:
            return AccessRecoverResult(
                status=status,
                recovery=RecoveryGuidance(
                    recommended_action=RecoveryAction.WAIT,
                    available_actions=[RecoveryAction.RECONNECT],
                    reconnect_route="/api/access/reconnect",
                    requires_redemption_code=False,
                ),
                reaction=RecoverReaction(kind=RecoverReactionKind.WAIT),
            )

        if status.runtime_running and status.state is AccessState.LIVE:
            return AccessRecoverResult(
                status=status,
                recovery=RecoveryGuidance(
                    recommended_action=RecoveryAction.NONE,
                    available_actions=[],
                    requires_redemption_code=False,
                ),
                reaction=RecoverReaction(kind=RecoverReactionKind.NONE),
            )

        runtime = self.reconnect()
        return AccessRecoverResult(
            status=runtime.status,
            recovery=RecoveryGuidance(
                recommended_action=RecoveryAction.RECONNECT,
                available_actions=[RecoveryAction.RECONNECT],
                reconnect_route="/api/access/reconnect",
                requires_redemption_code=False,
            ),
            reaction=RecoverReaction(kind=RecoverReactionKind.RECONNECT_STARTED),
            runtime_result=runtime.runtime_result,
        )

    def list_pending_authorizations(self) -> list[PendingAuthorizationRequest]:
        record = self._enrolled_record()
        response = self._broker_get(record, "/api/oauth/pending-authorizations")

        try:
            return BrokerItemsResponse.model_validate_json(response.text).items
        except ValidationError as error:
            raise AccessError("Broker pending-authorizations response was invalid") from error

    def approve_pending_authorization(self, request_id: str) -> BrokerActionResult:
        if request_id.strip() == "":
            raise AccessError("request_id is required")

        record = self._enrolled_record()
        pending = None

        for item in self.list_pending_authorizations():
            if item.request_id == request_id:
                pending = item
                break

        if pending is None:
            raise AccessError(f"unknown pending authorization request: {request_id}", 404)

        proof = self._owner_approval_proof(record, pending)
        response = self._broker_post(
            record,
            f"/api/oauth/pending-authorizations/{request_id}/approve",
            proof,
        )
        return self._action_result(response)

    def list_connected_sessions(self) -> list[ConnectedOAuthSession]:
        record = self._enrolled_record()
        response = self._broker_get(record, "/api/oauth/connected-sessions")

        try:
            return BrokerSessionItemsResponse.model_validate_json(response.text).items
        except ValidationError as error:
            raise AccessError("Broker connected-sessions response was invalid") from error

    def revoke_connected_session(self, client_id: str) -> BrokerActionResult:
        if client_id.strip() == "":
            raise AccessError("client_id is required")

        record = self._enrolled_record()
        response = self._broker_post(
            record,
            f"/api/oauth/connected-sessions/{client_id}/revoke",
            None,
        )
        return self._action_result(response)

    def revoke_all_connected_sessions(self) -> BrokerActionResult:
        record = self._enrolled_record()
        response = self._broker_post(record, "/api/oauth/connected-sessions/revoke-all", None)
        return self._action_result(response)

    def resolve_share_session(
        self,
        payload: AccessShareSessionResolveRequest,
    ) -> ResolvedBaseShareSession:
        raw_input = payload.input.strip()

        if raw_input == "":
            raise AccessError("input is required")

        envelope = self._parse_invite_input(raw_input, payload.expected_broker_base_url)
        accepted_at = self._now()
        existing = self._access_repository.get_accepted_share(envelope.base_share_grant_id)
        share = AcceptedShareRecord(
            grant_id=envelope.base_share_grant_id,
            share_base_id=envelope.share_base_id,
            share_base_title=envelope.share_base_title,
            permission=envelope.permission,
            recipient_actor_ref=envelope.recipient_actor_ref,
            recipient_account_id=envelope.recipient_account_id,
            owner_actor_ref=self._typed_actor_ref(envelope.device_id, "device:"),
            owner_display_name=envelope.owner_display_name,
            owner_access_url=envelope.owner_access_url,
            broker_base_url=envelope.broker_base_url,
            device_id=envelope.device_id,
            share_entry_id=envelope.share_entry_id,
            grant_created_at=envelope.grant_created_at,
            accepted_at=existing.accepted_at if existing is not None else accepted_at,
            expires_at=envelope.expires_at,
            visible_in_mcp=existing.visible_in_mcp if existing is not None else True,
            session_state="ready",
            invite_url=raw_input if raw_input.startswith("http") else None,
            transport_envelope=envelope,
        )
        self._access_repository.save_accepted_share(share)
        recipient_key = envelope.recipient_account_id or envelope.recipient_actor_ref

        return ResolvedBaseShareSession(
            session_id=f"shared-base-session:{envelope.base_share_grant_id}:{recipient_key}",
            label=envelope.share_base_title,
            state=share.session_state,
            share_base_id=envelope.share_base_id,
            share_base_title=envelope.share_base_title,
            permission=envelope.permission,
            recipient_actor_ref=envelope.recipient_actor_ref,
            recipient_account_id=envelope.recipient_account_id,
            broker_base_url=envelope.broker_base_url,
            device_id=envelope.device_id,
            owner_access_url=envelope.owner_access_url,
            owner_display_name=envelope.owner_display_name,
            share_entry_id=envelope.share_entry_id,
            grant_created_at=envelope.grant_created_at,
            activated_at=share.accepted_at,
            transport_envelope=envelope,
        )

    def mint_invite(self, payload: InviteMintRequest) -> ShareInvite:
        record = self._enrolled_record()
        device_id = record.identity

        if device_id is None or device_id.strip() == "":
            raise AccessError("Enrollment identity is missing", 409)

        proof_key_id = record.enrollment_data.get("credential_generation_id", "").strip()

        if proof_key_id == "":
            raise AccessError("Enrollment credential generation id is missing", 409)

        broker_base_url = (
            record.enrollment_data.get("broker_base_url")
            or record.enrollment_data.get("authorization_server_url")
            or self._settings.broker_base_url
        ).rstrip("/")
        owner_access_url = (
            (record.access_url or "").strip()
            or record.enrollment_data.get("protected_resource_url", "").strip()
            or self.derive_owner_access_url(device_id, broker_base_url)
        )
        issued_at = datetime.now(UTC).isoformat()
        message = self._invite_message(
            device_id=device_id,
            proof_key_id=proof_key_id,
            proof_issued_at=issued_at,
            payload=payload,
            owner_access_url=owner_access_url,
        )
        owner_proof = self._sign(record, message)
        envelope = ShareTransportEnvelope(
            broker_base_url=broker_base_url,
            device_id=device_id,
            owner_access_url=owner_access_url,
            owner_proof_key_id=proof_key_id,
            owner_proof_issued_at=issued_at,
            owner_proof=owner_proof,
            base_share_grant_id=payload.grant_id,
            recipient_actor_ref=payload.recipient_actor_ref,
            recipient_account_id=payload.recipient_account_id,
            share_base_id=payload.share_base_id,
            share_entry_id=payload.share_entry_id,
            share_base_title=payload.share_base_title,
            permission=payload.permission,
            grant_created_at=payload.grant_created_at,
            owner_display_name=payload.owner_display_name,
            expires_at=payload.expires_at,
            message=payload.message,
        )
        query = self._invite_query(envelope)
        invite_url = f"{broker_base_url}/public-app/base-share?{urlencode(query)}"

        return ShareInvite(
            grant_id=payload.grant_id,
            recipient_actor_ref=payload.recipient_actor_ref,
            recipient_account_id=payload.recipient_account_id,
            share_base_id=payload.share_base_id,
            share_entry_id=payload.share_entry_id,
            share_base_title=payload.share_base_title,
            permission=payload.permission,
            transport_envelope=envelope,
            owner_display_name=payload.owner_display_name or "",
            grant_created_at=payload.grant_created_at,
            expires_at=payload.expires_at,
            broker_base_url=broker_base_url,
            device_id=device_id,
            share_invite_url=invite_url,
        )

    def list_accepted_shares(self) -> list[AcceptedShareRecord]:
        return self._access_repository.list_accepted_shares()

    def get_accepted_share(self, grant_id: str) -> AcceptedShareRecord | None:
        return self._access_repository.get_accepted_share(grant_id)

    def update_accepted_share(self, share: AcceptedShareRecord) -> AcceptedShareRecord:
        return self._access_repository.save_accepted_share(share)

    def remove_accepted_share(self, grant_id: str) -> None:
        if self._access_repository.get_accepted_share(grant_id) is None:
            raise AccessError(f"Accepted share {grant_id} not found", 404)

        self._access_repository.delete_accepted_share(grant_id)

    def _enrolled_record(self) -> AccessCredentialRecord:
        record = self._access_repository.load()

        if record is None:
            raise AccessError("Enrollment is required", 409)

        if not self._has_credentials(record):
            raise AccessError("Enrollment credentials are missing", 409)

        return record

    def _status(self, record: AccessCredentialRecord | None) -> AccessStatus:
        if record is None:
            return AccessStatus(
                enabled=True,
                mode=AccessMode.MANAGED_PUBLIC,
                state=AccessState.ENROLLMENT_REQUIRED,
                enrollment_material_present=False,
                credential_material_present=False,
                runtime_running=False,
                access_url=None,
                observed_at=self._now(),
                identity=None,
                last_error=None,
                details={},
            )

        runtime_running = self._access_relay.running()
        relay_state = self._access_relay.state()
        last_error = self._access_relay.last_error()
        state = AccessState.ENROLLED

        if runtime_running:
            state = relay_state
        elif last_error is not None:
            state = AccessState.UNAVAILABLE

        if not self._has_credentials(record):
            state = AccessState.REAUTH_REQUIRED

        details: dict[str, str] = {}

        if record.identity is not None:
            details["actor_ref"] = self._typed_actor_ref(record.identity, "device:")

        account_id = record.enrollment_data.get("account_id", "").strip()

        if account_id != "":
            details["account_actor_ref"] = f"account:{account_id}"
            details["recipient_actor_ref"] = f"account:{account_id}"

        return AccessStatus(
            enabled=True,
            mode=record.mode,
            state=state,
            enrollment_material_present=True,
            credential_material_present=self._has_credentials(record),
            runtime_running=runtime_running,
            access_url=record.access_url,
            observed_at=self._now(),
            identity=record.identity,
            last_error=last_error,
            details=details,
        )

    def _runtime_state(self, status: AccessStatus) -> AccessRuntimeState | None:
        if not status.enrollment_material_present:
            return None

        return AccessRuntimeState(
            mode=status.mode,
            state=status.state,
            observed_at=status.observed_at,
            details=status.details,
            last_error=status.last_error,
        )

    def _runtime_response(self, action: str, details: str | None) -> AccessRuntimeResponse:
        return AccessRuntimeResponse(
            status=self.summary().status,
            runtime_result=AccessRuntimeResult(action=action, pid=None, details=details),
        )

    def _broker_get(self, record: AccessCredentialRecord, path: str) -> httpx.Response:
        device_id = record.identity or ""

        try:
            response = self._http_client.get(
                f"{self._broker_url(record)}{path}",
                params={"device_id": device_id},
                headers=self._relay_headers(record),
                timeout=self._settings.broker_timeout_seconds,
            )
        except httpx.RequestError as error:
            raise AccessError(
                "Could not reach the broker. Check the network and retry.",
                502,
            ) from error

        return self._raise_for_broker(response)

    def _broker_post(
        self,
        record: AccessCredentialRecord,
        path: str,
        body: dict[str, str] | None,
    ) -> httpx.Response:
        device_id = record.identity or ""

        try:
            response = self._http_client.post(
                f"{self._broker_url(record)}{path}",
                json=body,
                headers=self._relay_headers(record),
                params={"device_id": device_id},
                timeout=self._settings.broker_timeout_seconds,
            )
        except httpx.RequestError as error:
            raise AccessError(
                "Could not reach the broker. Check the network and retry.",
                502,
            ) from error

        return self._raise_for_broker(response)

    def _http_post(self, url: str, body: dict[str, str]) -> httpx.Response:
        try:
            return self._http_client.post(
                url,
                json=body,
                timeout=self._settings.broker_timeout_seconds,
            )
        except httpx.RequestError as error:
            raise AccessError(
                "Activation could not reach the broker. Check the network and retry.",
                502,
            ) from error

    def _broker_url(self, record: AccessCredentialRecord) -> str:
        return (
            record.enrollment_data.get("broker_base_url")
            or record.enrollment_data.get("authorization_server_url")
            or self._settings.broker_base_url
        ).rstrip("/")

    @staticmethod
    def _relay_headers(record: AccessCredentialRecord) -> dict[str, str]:
        return {"Authorization": f"Bearer {record.credential_data.get('relay_token', '')}"}

    @staticmethod
    def _raise_for_broker(response: httpx.Response) -> httpx.Response:
        if response.status_code < 400:
            return response

        if response.status_code == 404:
            raise AccessError("unknown broker resource", 404)

        if response.status_code in {401, 403}:
            raise AccessError("broker request was rejected", response.status_code)

        if response.status_code >= 500:
            raise AccessError("broker request failed", 502)

        raise AccessError("broker request failed", response.status_code)

    @staticmethod
    def _action_result(response: httpx.Response) -> BrokerActionResult:
        try:
            return BrokerActionResult.model_validate_json(response.text)
        except ValidationError:
            return BrokerActionResult(status="ok")

    @staticmethod
    def _enroll_error(response: httpx.Response) -> AccessError:
        broker_error = ""

        try:
            broker_error = BrokerErrorBody.model_validate_json(response.text).error or ""
        except ValidationError:
            broker_error = ""

        if response.status_code == 409 and broker_error == "transfer_required":
            return AccessError(
                "Pro is already active on another device. "
                "Transfer activation to this device from your account.",
                409,
            )

        if response.status_code == 409 and broker_error == "seat_unavailable":
            return AccessError(
                "No activation seat is available for this device. Contact support to continue.",
                409,
            )

        if response.status_code in {400, 401, 403, 404, 409, 410, 422}:
            return AccessError(
                "Activation was rejected for this device. "
                "Start activation again from your account.",
                409,
            )

        return AccessError(
            "Activation broker returned a temporary error. Retry activation later.",
            502,
        )

    def _owner_approval_proof(
        self,
        record: AccessCredentialRecord,
        pending: PendingAuthorizationRequest,
    ) -> dict[str, str]:
        proof_key_id = record.enrollment_data.get("credential_generation_id", "").strip()

        if proof_key_id == "" or record.identity is None:
            raise AccessError("Enrollment proof material is missing", 409)

        issued_at = datetime.now(UTC).isoformat()
        message = "\n".join(
            (
                self._settings.owner_authorization_message_version,
                f"device_id={record.identity}",
                f"client_id={pending.client_id}",
                f"redirect_uri={pending.redirect_uri}",
                f"resource={pending.resource}",
                f"code_challenge={pending.code_challenge}",
                f"code_challenge_method={pending.code_challenge_method}",
                f"state={pending.state or ''}",
                f"proof_key_id={proof_key_id}",
                f"proof_issued_at={issued_at}",
            )
        )

        return {
            "owner_proof_key_id": proof_key_id,
            "owner_proof_issued_at": issued_at,
            "owner_proof": self._sign(record, message),
            "resource": pending.resource,
        }

    def _parse_invite_input(
        self,
        raw_input: str,
        expected_broker_base_url: str | None,
    ) -> ShareTransportEnvelope:
        if raw_input.startswith("{"):
            try:
                envelope = ShareTransportEnvelope.model_validate_json(raw_input)
            except ValidationError as error:
                raise AccessError("invite input is not a valid share envelope") from error

            return self._checked_envelope(envelope, expected_broker_base_url)

        parsed = urlparse(raw_input)

        if parsed.scheme not in {"http", "https"} or parsed.netloc == "":
            raise AccessError("invite_url must be an absolute http or https URL")

        if parsed.path != "/public-app/base-share":
            raise AccessError("invite_url must target /public-app/base-share")

        broker_base_url = f"{parsed.scheme}://{parsed.netloc}"
        query = parse_qs(parsed.query, keep_blank_values=True)
        device_id = self._one_query(query, "device_id")
        owner_access_url = self._optional_query(query, "owner_access_url")

        if owner_access_url is None:
            owner_access_url = self.derive_owner_access_url(device_id, broker_base_url)
        recipient_actor_ref = self._optional_query(query, "recipient_actor_ref")
        recipient_account_id = self._optional_query(query, "recipient_account_id")

        if recipient_actor_ref is None and recipient_account_id is None:
            raise AccessError("recipient_actor_ref or recipient_account_id is required")

        if recipient_actor_ref is None:
            recipient_actor_ref = f"account:{recipient_account_id}"

        envelope = ShareTransportEnvelope(
            broker_base_url=broker_base_url,
            device_id=device_id,
            owner_access_url=owner_access_url,
            owner_proof_key_id=self._one_query(query, "owner_proof_key_id"),
            owner_proof_issued_at=self._one_query(query, "owner_proof_issued_at"),
            owner_proof=self._one_query(query, "owner_proof"),
            base_share_grant_id=self._one_query(query, "base_share_grant_id"),
            recipient_actor_ref=recipient_actor_ref,
            recipient_account_id=recipient_account_id,
            share_base_id=self._one_query(query, "share_base_id"),
            share_entry_id=self._optional_query(query, "share_entry_id"),
            share_base_title=self._one_query(query, "share_base_title"),
            permission=ShareGrantPermission(self._one_query(query, "permission").lower()),
            grant_created_at=self._optional_query(query, "grant_created_at"),
            owner_display_name=self._optional_query(query, "owner_display_name"),
            expires_at=self._optional_query(query, "expires_at"),
            message=self._optional_query(query, "message"),
        )
        return self._checked_envelope(envelope, expected_broker_base_url)

    @staticmethod
    def _checked_envelope(
        envelope: ShareTransportEnvelope,
        expected_broker_base_url: str | None,
    ) -> ShareTransportEnvelope:
        if expected_broker_base_url is None:
            return envelope

        expected = urlparse(expected_broker_base_url.strip())
        expected_broker = f"{expected.scheme}://{expected.netloc}".rstrip("/")

        if expected_broker != envelope.broker_base_url.rstrip("/"):
            raise AccessError("invite_url broker base does not match expected broker base url")

        return envelope

    @staticmethod
    def _one_query(query: dict[str, list[str]], field_name: str) -> str:
        values = query.get(field_name) or []

        if len(values) != 1 or values[0].strip() == "":
            raise AccessError(f"{field_name} is required")

        return values[0].strip()

    @staticmethod
    def _optional_query(query: dict[str, list[str]], field_name: str) -> str | None:
        values = query.get(field_name) or []

        if len(values) != 1:
            return None

        value = values[0].strip()

        if value == "":
            return None

        return value

    def _invite_message(
        self,
        device_id: str,
        proof_key_id: str,
        proof_issued_at: str,
        payload: InviteMintRequest,
        owner_access_url: str,
    ) -> str:
        return "\n".join(
            (
                self._settings.base_share_invite_message_version,
                f"device_id={device_id}",
                f"proof_key_id={proof_key_id}",
                f"proof_issued_at={proof_issued_at}",
                f"base_share_grant_id={payload.grant_id}",
                f"recipient_actor_ref={payload.recipient_actor_ref}",
                f"recipient_account_id={payload.recipient_account_id or ''}",
                f"share_base_id={payload.share_base_id}",
                f"share_entry_id={payload.share_entry_id or ''}",
                f"share_base_title={payload.share_base_title}",
                f"permission={payload.permission.value}",
                f"owner_access_url={owner_access_url}",
                f"grant_created_at={payload.grant_created_at or ''}",
                f"owner_display_name={payload.owner_display_name or ''}",
                f"expires_at={payload.expires_at or ''}",
                f"message={payload.message or ''}",
            )
        )

    @staticmethod
    def _invite_query(envelope: ShareTransportEnvelope) -> dict[str, str]:
        query = {
            "device_id": envelope.device_id,
            "owner_proof_key_id": envelope.owner_proof_key_id,
            "owner_proof_issued_at": envelope.owner_proof_issued_at,
            "owner_proof": envelope.owner_proof,
            "base_share_grant_id": envelope.base_share_grant_id,
            "recipient_actor_ref": envelope.recipient_actor_ref,
            "share_base_id": envelope.share_base_id,
            "share_base_title": envelope.share_base_title,
            "permission": envelope.permission.value,
            "owner_access_url": envelope.owner_access_url,
        }

        if envelope.share_entry_id is not None:
            query["share_entry_id"] = envelope.share_entry_id

        if envelope.grant_created_at is not None:
            query["grant_created_at"] = envelope.grant_created_at

        if envelope.recipient_account_id is not None:
            query["recipient_account_id"] = envelope.recipient_account_id

        if envelope.owner_display_name is not None:
            query["owner_display_name"] = envelope.owner_display_name

        if envelope.expires_at is not None:
            query["expires_at"] = envelope.expires_at

        if envelope.message is not None:
            query["message"] = envelope.message

        return query

    @staticmethod
    def _sign(record: AccessCredentialRecord, message: str) -> str:
        private_key_pem = record.credential_data.get("client_private_key_pem", "").strip()

        if private_key_pem == "":
            raise AccessError("Enrollment private key is missing", 409)

        loaded = serialization.load_pem_private_key(private_key_pem.encode("utf-8"), password=None)
        raw = loaded.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption(),
        )
        signature = Ed25519PrivateKey.from_private_bytes(raw).sign(message.encode("utf-8"))
        return base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")

    @staticmethod
    def generate_device_keys() -> tuple[str, str]:
        private_key = Ed25519PrivateKey.generate()
        public_key = base64.b64encode(
            private_key.public_key().public_bytes(
                encoding=serialization.Encoding.Raw,
                format=serialization.PublicFormat.Raw,
            )
        ).decode("ascii")
        private_key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode("utf-8")
        return public_key, private_key_pem

    @staticmethod
    def derive_owner_access_url(device_id: str, broker_base_url: str) -> str:
        parsed = urlparse(broker_base_url.strip())

        if parsed.scheme not in {"http", "https"} or parsed.netloc == "":
            raise AccessError("broker_base_url must be an absolute http or https URL")

        host_labels = parsed.netloc.split(".")

        if len(host_labels) < 2:
            raise AccessError("broker_base_url must include a routable host")

        zone_host = ".".join(host_labels[1:])
        return f"{parsed.scheme}://{device_id}.{zone_host}/mcp"

    @staticmethod
    def _public_record(record: AccessCredentialRecord | None) -> AccessCredentialRecord | None:
        if record is None:
            return None

        return record.model_copy(update={"credential_data": {}})

    @staticmethod
    def _has_credentials(record: AccessCredentialRecord) -> bool:
        relay_token = record.credential_data.get("relay_token", "").strip()
        private_key = record.credential_data.get("client_private_key_pem", "").strip()
        relay_url = record.enrollment_data.get("relay_url", "").strip()
        return relay_token != "" and private_key != "" and relay_url != ""

    @staticmethod
    def _typed_actor_ref(value: str, prefix: str) -> str:
        if value.startswith("device:") or value.startswith("account:"):
            return value

        return f"{prefix}{value}"

    @staticmethod
    def _account_identity(record: AccessCredentialRecord | None) -> AccountIdentitySummary | None:
        if record is None:
            return None

        email = record.enrollment_data.get("account_email")
        display_name = record.enrollment_data.get("account_display_name")
        account_id = record.enrollment_data.get("account_id")

        if email is None and display_name is None and account_id is None:
            return None

        return AccountIdentitySummary(
            email=email,
            display_name=display_name,
            account_id=account_id,
        )

    @staticmethod
    def _onboarding(record: AccessCredentialRecord | None) -> dict[str, str]:
        onboarding = {
            "enroll_route": "/api/access/enroll",
            "reconnect_route": "/api/access/reconnect",
        }

        if record is None:
            return onboarding

        protected_resource_url = record.enrollment_data.get("protected_resource_url", "").strip()
        authorization_server_url = record.enrollment_data.get(
            "authorization_server_url",
            "",
        ).strip()

        if protected_resource_url != "":
            onboarding["protected_resource_url"] = protected_resource_url

        if authorization_server_url != "":
            onboarding["authorization_server_url"] = authorization_server_url

        return onboarding

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
