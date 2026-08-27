from dependencies import get_base_registry_repository, get_registry_session, get_sharing_repository
from dependencies import get_sharing_service as load_sharing_service
from interfaces.services.sharing import ISharingService
from schemas.sharing import (
    OwnerShareManagementItem,
    ShareGrantCreateRequest,
    ShareGrantDeletedResponse,
    ShareGrantPermission,
    ShareGrantRecord,
)

from .protocol import MCPServerApp


def get_sharing_service() -> ISharingService:
    session = get_registry_session()

    return load_sharing_service(
        sharing_repository=get_sharing_repository(db=session),
        base_registry_repository=get_base_registry_repository(db=session),
    )


def sharing_list_owner_grants(
    owner_actor_ref: str,
    evaluation_at: str | None = None,
    base_id: str | None = None,
    entry_id: str | None = None,
) -> list[OwnerShareManagementItem]:
    return get_sharing_service().list_owner_view(
        owner_actor_ref=owner_actor_ref,
        evaluation_at=evaluation_at,
        base_id=base_id,
        entry_id=entry_id,
    )


def sharing_create_grant(
    owner_actor_ref: str,
    permission: ShareGrantPermission,
    recipient_actor_ref: str | None = None,
    recipient_account_id: str | None = None,
    base_id: str | None = None,
    entry_id: str | None = None,
    expires_at: str | None = None,
) -> ShareGrantRecord:
    return get_sharing_service().create_grant(
        ShareGrantCreateRequest(
            owner_actor_ref=owner_actor_ref,
            recipient_actor_ref=recipient_actor_ref,
            recipient_account_id=recipient_account_id,
            base_id=base_id,
            entry_id=entry_id,
            permission=permission,
            expires_at=expires_at,
        )
    )


def sharing_revoke_grant(
    grant_id: str,
    revocation_reason: str | None = None,
) -> ShareGrantRecord:
    return get_sharing_service().revoke_grant(grant_id, revocation_reason)


def sharing_delete_grant(grant_id: str) -> ShareGrantDeletedResponse:
    return get_sharing_service().delete_grant(grant_id)


def register(mcp: MCPServerApp) -> None:
    mcp.tool()(sharing_list_owner_grants)
    mcp.tool()(sharing_create_grant)
    mcp.tool()(sharing_revoke_grant)
    mcp.tool()(sharing_delete_grant)
