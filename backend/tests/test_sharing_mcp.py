import mcp_server.sharing as mcp_sharing
from schemas.sharing import ShareGrantPermission
from services.sharing import SharingService


def test_mcp_sharing_tools(mcp_sharing_service: SharingService) -> None:
    created = mcp_sharing.sharing_create_grant(
        owner_actor_ref="device:owner-one",
        recipient_account_id="alice",
        permission=ShareGrantPermission.READ,
    )
    items = mcp_sharing.sharing_list_owner_grants(owner_actor_ref="device:owner-one")
    revoked = mcp_sharing.sharing_revoke_grant(created.grant_id)
    deleted = mcp_sharing.sharing_delete_grant(created.grant_id)

    assert created.recipient_actor_ref == "account:alice"
    assert [item.grant_id for item in items] == [created.grant_id]
    assert revoked.revoked_at is not None
    assert deleted.removed is True
    assert mcp_sharing.sharing_list_owner_grants(owner_actor_ref="device:owner-one") == []
