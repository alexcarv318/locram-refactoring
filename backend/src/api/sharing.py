from fastapi import APIRouter, Depends, Query

from dependencies import get_sharing_service
from interfaces.services.sharing import ISharingService
from schemas.sharing import (
    OwnerShareManagementListResponse,
    RecipientBackupRequest,
    RecipientBackupResponse,
    RecipientMcpVisibilityRequest,
    RecipientRenameRequest,
    RecipientShareViewListResponse,
    RecipientShareViewResponse,
    ShareGrantCreateRequest,
    ShareGrantDeletedResponse,
    ShareGrantResponse,
    ShareGrantRevokeRequest,
    ShareInviteResponse,
)

sharing_router = APIRouter(prefix="/api/base-share-grants")


@sharing_router.get("/owner-view", response_model=OwnerShareManagementListResponse)
def list_owner_view(
    owner_actor_ref: str = Query(),
    evaluation_at: str | None = Query(default=None),
    base_id: str | None = Query(default=None),
    entry_id: str | None = Query(default=None),
    sharing_service: ISharingService = Depends(get_sharing_service),
) -> OwnerShareManagementListResponse:
    return OwnerShareManagementListResponse(
        items=sharing_service.list_owner_view(
            owner_actor_ref=owner_actor_ref,
            evaluation_at=evaluation_at,
            base_id=base_id,
            entry_id=entry_id,
        )
    )


@sharing_router.get("/recipient-view", response_model=RecipientShareViewListResponse)
def list_recipient_view(
    recipient_actor_ref: str | None = Query(default=None),
    recipient_account_id: str | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    evaluation_at: str | None = Query(default=None),
    sharing_service: ISharingService = Depends(get_sharing_service),
) -> RecipientShareViewListResponse:
    return RecipientShareViewListResponse(
        items=sharing_service.list_recipient_view(
            recipient_actor_ref=recipient_actor_ref,
            recipient_account_id=recipient_account_id,
            include_inactive=include_inactive,
            evaluation_at=evaluation_at,
        )
    )


@sharing_router.post("", response_model=ShareGrantResponse, status_code=201)
def create_grant(
    payload: ShareGrantCreateRequest,
    sharing_service: ISharingService = Depends(get_sharing_service),
) -> ShareGrantResponse:
    return ShareGrantResponse(item=sharing_service.create_grant(payload))


@sharing_router.post("/{grant_id}/revoke", response_model=ShareGrantResponse)
def revoke_grant(
    grant_id: str,
    payload: ShareGrantRevokeRequest | None = None,
    sharing_service: ISharingService = Depends(get_sharing_service),
) -> ShareGrantResponse:
    request = payload if payload is not None else ShareGrantRevokeRequest()

    return ShareGrantResponse(
        item=sharing_service.revoke_grant(grant_id, request.revocation_reason)
    )


@sharing_router.post("/{grant_id}/delete", response_model=ShareGrantDeletedResponse)
def delete_grant(
    grant_id: str,
    sharing_service: ISharingService = Depends(get_sharing_service),
) -> ShareGrantDeletedResponse:
    return sharing_service.delete_grant(grant_id)


@sharing_router.get("/{grant_id}/invite", response_model=ShareInviteResponse)
def get_invite(
    grant_id: str,
    owner_display_name: str | None = Query(default=None),
    message: str | None = Query(default=None),
    sharing_service: ISharingService = Depends(get_sharing_service),
) -> ShareInviteResponse:
    return ShareInviteResponse(
        item=sharing_service.get_invite(grant_id, owner_display_name, message)
    )


@sharing_router.post("/{grant_id}/mcp-visibility", response_model=RecipientShareViewResponse)
def set_recipient_mcp_visibility(
    grant_id: str,
    payload: RecipientMcpVisibilityRequest,
    sharing_service: ISharingService = Depends(get_sharing_service),
) -> RecipientShareViewResponse:
    return RecipientShareViewResponse(
        item=sharing_service.set_recipient_mcp_visibility(grant_id, payload.visible_in_mcp)
    )


@sharing_router.put("/{grant_id}/rename", response_model=RecipientShareViewResponse)
def rename_recipient(
    grant_id: str,
    payload: RecipientRenameRequest,
    sharing_service: ISharingService = Depends(get_sharing_service),
) -> RecipientShareViewResponse:
    return RecipientShareViewResponse(
        item=sharing_service.rename_recipient(grant_id, payload.share_base_title)
    )


@sharing_router.post("/{grant_id}/remove", response_model=ShareGrantDeletedResponse)
def remove_recipient(
    grant_id: str,
    sharing_service: ISharingService = Depends(get_sharing_service),
) -> ShareGrantDeletedResponse:
    return sharing_service.remove_recipient(grant_id)


@sharing_router.post("/{grant_id}/backup", response_model=RecipientBackupResponse)
def backup_recipient(
    grant_id: str,
    payload: RecipientBackupRequest | None = None,
    sharing_service: ISharingService = Depends(get_sharing_service),
) -> RecipientBackupResponse:
    request = payload if payload is not None else RecipientBackupRequest()

    return RecipientBackupResponse(
        item=sharing_service.backup_recipient(grant_id, request.trigger)
    )
