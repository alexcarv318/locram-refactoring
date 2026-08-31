from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from schemas.links import PageGraph
from schemas.pages import PageDetail, PageSearchHit, PageSummary


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


class ShareTransportEnvelope(BaseModel):
    broker_base_url: str
    device_id: str
    owner_access_url: str
    owner_proof_key_id: str
    owner_proof_issued_at: str
    owner_proof: str
    base_share_grant_id: str
    recipient_actor_ref: str
    recipient_account_id: str | None = None
    share_base_id: str
    share_entry_id: str | None = None
    share_base_title: str
    permission: ShareGrantPermission
    grant_created_at: str | None = None
    owner_display_name: str | None = None
    expires_at: str | None = None
    message: str | None = None


class ShareInvite(BaseModel):
    grant_id: str
    recipient_actor_ref: str
    recipient_account_id: str | None
    share_base_id: str
    share_entry_id: str | None = None
    share_base_title: str
    permission: ShareGrantPermission
    transport_envelope: ShareTransportEnvelope
    owner_display_name: str
    grant_created_at: str | None = None
    expires_at: str | None = None
    broker_base_url: str
    device_id: str
    share_invite_url: str


class BaseShareStats(BaseModel):
    page_count: int | None = None
    active_page_count: int | None = None
    embedded_count: int | None = None
    link_count: int | None = None
    size_bytes: int | None = None
    orphan_count: int | None = None
    unembedded_count: int | None = None
    due_for_review_count: int | None = None


class OwnerShareManagementItem(ShareGrantRecord):
    recipient_account_id: str | None
    share_base_title: str | None
    grant_state: ShareGrantState
    activation_state: ShareActivationState
    invite: ShareInvite | None = None
    registered_at: str | None = None
    base_path: str | None = None
    base_stats: BaseShareStats | None = None


class RecipientShareViewItem(ShareGrantRecord):
    recipient_account_id: str | None
    share_base_title: str
    owner_display_name: str | None = None
    grant_state: ShareGrantState
    activation_state: ShareActivationState
    session_state: str | None = None
    visible_in_mcp: bool
    base_stats: BaseShareStats | None = None
    authority_db_path: str | None = None
    authority_available: bool = False


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


class RecipientBackupResult(BaseModel):
    filename: str
    path: str | None = None


class ShareInviteResponse(BaseModel):
    item: ShareInvite


class RecipientShareViewResponse(BaseModel):
    item: RecipientShareViewItem


class RecipientBackupResponse(BaseModel):
    item: RecipientBackupResult


class BaseSharePageFields(BaseModel):
    title: str | None = None
    content: str | None = None


class BaseShareSessionRequest(BaseModel):
    invite_url: str | None = None
    transport_envelope: ShareTransportEnvelope
    operation: str
    recipient_actor_ref: str
    required_permission: str | None = None
    parent_id: str | None = None
    limit: int | None = None
    offset: int | None = None
    page_id: str | None = None
    expand_hops: int | None = None
    query: str | None = None
    fields: BaseSharePageFields | None = None
    activated_at: str | None = None


class RemotePageListItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    type: str = "fleeting"
    status: str = "active"
    subject: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    parent_id: str | None = None
    created_at: str = ""
    updated_at: str = ""
    reviewed_at: str | None = None
    review_interval_days: int = 7
    content: str = ""
    content_hash: str | None = None
    child_count: int = 0
    active_descendant_count: int = 0


class RemotePageConnection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    link_type: str
    direction: str


class RemotePageDetail(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    content: str = ""
    type: str = "fleeting"
    status: str = "active"
    subject: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    parent_id: str | None = None
    content_hash: str | None = None
    review_interval_days: int = 7
    created_at: str = ""
    updated_at: str = ""
    reviewed_at: str | None = None
    connected_to: list[RemotePageConnection] = Field(default_factory=list)


class RemoteSearchHit(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    type: str = "fleeting"
    status: str = "active"
    snippet: str = ""
    rank: float | None = None


class BaseShareSessionResult(BaseModel):
    session_state: str
    items: list[PageSummary] | list[PageSearchHit] | None = None
    item: PageDetail | PageGraph | None = None
    stats: BaseShareStats | None = None
    share_base_title: str | None = None
    owner_display_name: str | None = None
    permission: str | None = None
    activated_at: str | None = None


class BaseShareSessionErrorBody(BaseModel):
    error: str
    session_state: str
    reason: str


class BaseShareErrorPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    error: str | None = None
    reason: str | None = None
    session_state: str | None = None


class BaseShareItemPayload(BaseShareErrorPayload):
    item: RemotePageDetail | None = None


class BaseShareListPayload(BaseShareErrorPayload):
    items: list[RemotePageListItem] = Field(default_factory=list)


class BaseShareSearchPayload(BaseShareErrorPayload):
    items: list[RemoteSearchHit] = Field(default_factory=list)


class BaseShareStatsPayload(BaseShareErrorPayload):
    stats: BaseShareStats | None = None
