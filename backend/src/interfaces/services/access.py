from abc import ABC, abstractmethod
from typing import Protocol

import httpx

from schemas.access import (
    AcceptedShareRecord,
    AccessCredentialRecord,
    AccessEnrollRequest,
    AccessIdentitySummary,
    AccessRecoverResult,
    AccessRuntimeResponse,
    AccessShareSessionResolveRequest,
    AccessState,
    AccessSummary,
    BrokerActionResult,
    ConnectedOAuthSession,
    InviteMintRequest,
    PendingAuthorizationRequest,
    ResolvedBaseShareSession,
)
from schemas.bridge import DesktopActivationStatus
from schemas.sharing import ShareInvite


class AccessHttpClient(Protocol):
    def get(
        self,
        url: str,
        *,
        params: dict[str, str] | None = None,
        headers: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response: ...

    def post(
        self,
        url: str,
        *,
        json: dict[str, str] | None = None,
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
        params: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response: ...


class IAccessRelay(ABC):
    @abstractmethod
    def start(self, record: AccessCredentialRecord) -> None: ...

    @abstractmethod
    def stop(self) -> None: ...

    @abstractmethod
    def running(self) -> bool: ...

    @abstractmethod
    def state(self) -> AccessState: ...

    @abstractmethod
    def last_error(self) -> str | None: ...


class IAccessService(ABC):
    """Access: device client for the Locram broker and product-api sign-in.

    Enroll this machine, persist credentials, expose identity, run the
    in-process relay, approve MCP authorizations, resolve share invites, and
    complete browser sign-in against production product-api.
    """

    @abstractmethod
    def summary(self) -> AccessSummary: ...

    @abstractmethod
    def identity(self) -> AccessIdentitySummary: ...

    @abstractmethod
    def enroll(self, payload: AccessEnrollRequest) -> AccessSummary: ...

    @abstractmethod
    def desktop_activation_status(self) -> DesktopActivationStatus: ...

    @abstractmethod
    def start_or_continue_desktop_activation(
        self,
        machine_label: str | None,
    ) -> DesktopActivationStatus: ...

    @abstractmethod
    def connect(self) -> AccessRuntimeResponse: ...

    @abstractmethod
    def reconnect(self) -> AccessRuntimeResponse: ...

    @abstractmethod
    def disconnect(self) -> AccessRuntimeResponse: ...

    @abstractmethod
    def recover(self) -> AccessRecoverResult: ...

    @abstractmethod
    def list_pending_authorizations(self) -> list[PendingAuthorizationRequest]: ...

    @abstractmethod
    def approve_pending_authorization(self, request_id: str) -> BrokerActionResult: ...

    @abstractmethod
    def list_connected_sessions(self) -> list[ConnectedOAuthSession]: ...

    @abstractmethod
    def revoke_connected_session(self, client_id: str) -> BrokerActionResult: ...

    @abstractmethod
    def revoke_all_connected_sessions(self) -> BrokerActionResult: ...

    @abstractmethod
    def resolve_share_session(
        self,
        payload: AccessShareSessionResolveRequest,
    ) -> ResolvedBaseShareSession: ...

    @abstractmethod
    def mint_invite(self, payload: InviteMintRequest) -> ShareInvite: ...

    @abstractmethod
    def list_accepted_shares(self) -> list[AcceptedShareRecord]: ...

    @abstractmethod
    def get_accepted_share(self, grant_id: str) -> AcceptedShareRecord | None: ...

    @abstractmethod
    def update_accepted_share(self, share: AcceptedShareRecord) -> AcceptedShareRecord: ...

    @abstractmethod
    def remove_accepted_share(self, grant_id: str) -> None: ...
