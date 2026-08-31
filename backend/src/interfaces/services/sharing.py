from abc import ABC, abstractmethod

from schemas.sharing import (
    BaseShareSessionRequest,
    BaseShareSessionResult,
    OwnerShareManagementItem,
    RecipientBackupResult,
    RecipientShareViewItem,
    ShareGrantCreateRequest,
    ShareGrantDeletedResponse,
    ShareGrantRecord,
    ShareInvite,
)


class ISharingService(ABC):
    """Sharing: owner grants, signed invites, and accepted recipient shares.

    Owner grants live on host-state. Invite minting uses Access credentials.
    Accepted shares appear as shared working bases. The recipient talks to the
    owner through IShareSession. The owner session runs list/get/search/update,
    get_page_graph, and base_stats against the granted local base. Recipient
    backup copies that local file, or snapshots the owner through IShareSession.
    """

    @abstractmethod
    def list_owner_view(
        self,
        owner_actor_ref: str,
        evaluation_at: str | None,
        base_id: str | None,
        entry_id: str | None,
    ) -> list[OwnerShareManagementItem]: ...

    @abstractmethod
    def list_recipient_view(
        self,
        recipient_actor_ref: str | None,
        recipient_account_id: str | None,
        include_inactive: bool,
        evaluation_at: str | None,
    ) -> list[RecipientShareViewItem]: ...

    @abstractmethod
    def create_grant(self, payload: ShareGrantCreateRequest) -> ShareGrantRecord: ...

    @abstractmethod
    def revoke_grant(self, grant_id: str, revocation_reason: str | None) -> ShareGrantRecord: ...

    @abstractmethod
    def delete_grant(self, grant_id: str) -> ShareGrantDeletedResponse: ...

    @abstractmethod
    def get_invite(
        self,
        grant_id: str,
        owner_display_name: str | None,
        message: str | None,
    ) -> ShareInvite: ...

    @abstractmethod
    def set_recipient_mcp_visibility(
        self,
        grant_id: str,
        visible_in_mcp: bool,
    ) -> RecipientShareViewItem: ...

    @abstractmethod
    def rename_recipient(self, grant_id: str, share_base_title: str) -> RecipientShareViewItem: ...

    @abstractmethod
    def remove_recipient(self, grant_id: str) -> ShareGrantDeletedResponse: ...

    @abstractmethod
    def backup_recipient(self, grant_id: str, trigger: str) -> RecipientBackupResult: ...

    @abstractmethod
    def run_session(self, payload: BaseShareSessionRequest) -> BaseShareSessionResult: ...
