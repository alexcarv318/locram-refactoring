from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class ShareGrantPermission(StrEnum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"


class ShareGrantState(StrEnum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class ShareActivationState(StrEnum):
    CREATED = "created"
    PENDING = "pending"
    ACTIVE = "active"


class ShareGrantRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    grant_id: str
    owner_actor_ref: str
    recipient_actor_ref: str
    base_id: str
    entry_id: str | None
    permission: ShareGrantPermission
    created_at: str
    last_invited_at: str | None
    activated_at: str | None
    expires_at: str | None
    revoked_at: str | None
    revocation_reason: str | None


class OwnerShareManagementItem(ShareGrantRecord):
    recipient_account_id: str | None
    share_base_title: str | None
    grant_state: ShareGrantState
    activation_state: ShareActivationState
    invite: None = None
    registered_at: str | None = None
    base_path: str | None = None


class RecipientShareViewItem(ShareGrantRecord):
    recipient_account_id: str | None
    share_base_title: str
    grant_state: ShareGrantState
    activation_state: ShareActivationState
    visible_in_mcp: bool


class ShareGrantCreateRequest(BaseModel):
    owner_actor_ref: str
    recipient_actor_ref: str | None = None
    recipient_account_id: str | None = None
    base_id: str | None = None
    entry_id: str | None = None
    permission: ShareGrantPermission
    expires_at: str | None = None


class ShareGrantRevokeRequest(BaseModel):
    revocation_reason: str | None = None


class ShareGrantDeletedResponse(BaseModel):
    removed: bool
    grant_id: str


class ShareGrantResponse(BaseModel):
    item: ShareGrantRecord


class OwnerShareManagementListResponse(BaseModel):
    items: list[OwnerShareManagementItem]


class RecipientShareViewListResponse(BaseModel):
    items: list[RecipientShareViewItem]


class RecipientMcpVisibilityRequest(BaseModel):
    visible_in_mcp: bool


class RecipientRenameRequest(BaseModel):
    share_base_title: str


class RecipientBackupRequest(BaseModel):
    trigger: str = "manual"
