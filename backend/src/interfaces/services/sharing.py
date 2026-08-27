from abc import ABC, abstractmethod
from typing import Never

from schemas.sharing import (
    OwnerShareManagementItem,
    RecipientShareViewItem,
    ShareGrantCreateRequest,
    ShareGrantDeletedResponse,
    ShareGrantRecord,
)


class ISharingService(ABC):
    """Sharing: local owner grants for a registered base.

    Create, list, revoke, and delete grants on host-state. Invite minting,
    recipient sessions, and shared working bases stay not-ready until Access.
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
    def get_invite(self, grant_id: str) -> Never: ...

    @abstractmethod
    def set_recipient_mcp_visibility(self, grant_id: str, visible_in_mcp: bool) -> Never: ...

    @abstractmethod
    def rename_recipient(self, grant_id: str, share_base_title: str) -> Never: ...

    @abstractmethod
    def remove_recipient(self, grant_id: str) -> Never: ...

    @abstractmethod
    def backup_recipient(self, grant_id: str, trigger: str) -> Never: ...
