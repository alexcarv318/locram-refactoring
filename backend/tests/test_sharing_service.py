import pytest

from exceptions.sharing import ShareGrantNotFoundError, SharingError, SharingNotReadyError
from schemas.sharing import ShareGrantCreateRequest, ShareGrantPermission, ShareGrantState
from services.sharing import SharingService


def test_create_list_revoke_delete(sharing_service: SharingService) -> None:
    created = sharing_service.create_grant(
        ShareGrantCreateRequest(
            owner_actor_ref="device:owner-one",
            recipient_account_id="alice",
            permission=ShareGrantPermission.READ,
        )
    )
    items = sharing_service.list_owner_view(
        owner_actor_ref="device:owner-one",
        evaluation_at=None,
        base_id=None,
        entry_id=None,
    )
    revoked = sharing_service.revoke_grant(created.grant_id, "done")
    deleted = sharing_service.delete_grant(created.grant_id)

    assert created.recipient_actor_ref == "account:alice"
    assert created.permission is ShareGrantPermission.READ
    assert len(items) == 1
    assert items[0].grant_id == created.grant_id
    assert items[0].recipient_account_id == "alice"
    assert items[0].grant_state is ShareGrantState.ACTIVE
    assert items[0].share_base_title is not None
    assert revoked.revoked_at is not None
    assert revoked.revocation_reason == "done"
    assert deleted.removed is True
    assert sharing_service.list_owner_view(
        owner_actor_ref="device:owner-one",
        evaluation_at=None,
        base_id=None,
        entry_id=None,
    ) == []


def test_owner_and_recipient_must_differ(sharing_service: SharingService) -> None:
    with pytest.raises(SharingError):
        sharing_service.create_grant(
            ShareGrantCreateRequest(
                owner_actor_ref="account:alice",
                recipient_actor_ref="account:alice",
                permission=ShareGrantPermission.WRITE,
            )
        )


def test_expired_grant_state(sharing_service: SharingService) -> None:
    created = sharing_service.create_grant(
        ShareGrantCreateRequest(
            owner_actor_ref="device:owner-one",
            recipient_actor_ref="account:bob",
            permission=ShareGrantPermission.ADMIN,
            expires_at="2020-01-01T00:00:00Z",
        )
    )
    items = sharing_service.list_owner_view(
        owner_actor_ref="device:owner-one",
        evaluation_at="2020-01-02T00:00:00Z",
        base_id=created.base_id,
        entry_id=created.entry_id,
    )

    assert items[0].grant_state is ShareGrantState.EXPIRED


def test_invite_and_recipient_need_access(sharing_service: SharingService) -> None:
    created = sharing_service.create_grant(
        ShareGrantCreateRequest(
            owner_actor_ref="device:owner-one",
            recipient_account_id="alice",
            permission=ShareGrantPermission.READ,
        )
    )

    assert sharing_service.list_recipient_view(
        recipient_actor_ref="account:alice",
        recipient_account_id=None,
        include_inactive=False,
        evaluation_at=None,
    ) == []

    with pytest.raises(SharingNotReadyError):
        sharing_service.get_invite(created.grant_id)

    with pytest.raises(ShareGrantNotFoundError):
        sharing_service.get_invite("missing")

    with pytest.raises(SharingNotReadyError):
        sharing_service.set_recipient_mcp_visibility(created.grant_id, False)
