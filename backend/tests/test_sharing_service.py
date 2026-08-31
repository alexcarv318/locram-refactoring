import pytest

from exceptions.access import AccessError
from exceptions.bases import WorkingBaseNotFoundError
from exceptions.sharing import ShareGrantNotFoundError, SharingError
from schemas.access import AccessShareSessionResolveRequest
from schemas.sharing import ShareGrantCreateRequest, ShareGrantPermission, ShareGrantState
from services.access import AccessService
from services.bases import BaseRegistryService
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


def test_invite_requires_enrollment(sharing_service: SharingService) -> None:
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

    with pytest.raises(AccessError):
        sharing_service.get_invite(created.grant_id, None, None)

    with pytest.raises(ShareGrantNotFoundError):
        sharing_service.get_invite("missing", None, None)

    with pytest.raises(ShareGrantNotFoundError):
        sharing_service.set_recipient_mcp_visibility(created.grant_id, False)


def test_invite_and_recipient_after_enroll(
    sharing_service: SharingService,
    enrolled_access: AccessService,
) -> None:
    sharing_service._access_service = enrolled_access
    created = sharing_service.create_grant(
        ShareGrantCreateRequest(
            owner_actor_ref="device:owner-one",
            recipient_account_id="alice",
            permission=ShareGrantPermission.READ,
        )
    )
    invite = sharing_service.get_invite(created.grant_id, "Ada", None)
    enrolled_access.resolve_share_session(
        AccessShareSessionResolveRequest(input=invite.share_invite_url)
    )
    recipients = sharing_service.list_recipient_view(
        recipient_actor_ref="account:alice",
        recipient_account_id=None,
        include_inactive=False,
        evaluation_at=None,
    )
    renamed = sharing_service.rename_recipient(created.grant_id, "Shared Notes")

    with pytest.raises(SharingError, match="Admin permission is required"):
        sharing_service.backup_recipient(created.grant_id, "manual")

    hidden = sharing_service.set_recipient_mcp_visibility(created.grant_id, False)
    removed = sharing_service.remove_recipient(created.grant_id)

    assert invite.grant_id == created.grant_id
    assert invite.share_invite_url.startswith("https://broker.example.test/public-app/base-share?")
    assert len(recipients) == 1
    assert recipients[0].share_base_title is not None
    assert renamed.share_base_title == "Shared Notes"
    assert hidden.visible_in_mcp is False
    assert removed.removed is True


def test_accepted_share_is_a_working_base(
    sharing_service: SharingService,
    enrolled_access: AccessService,
    base_registry_service: BaseRegistryService,
) -> None:
    sharing_service._access_service = enrolled_access
    base_registry_service._access_service = enrolled_access
    created = sharing_service.create_grant(
        ShareGrantCreateRequest(
            owner_actor_ref="device:owner-one",
            recipient_account_id="alice",
            permission=ShareGrantPermission.READ,
        )
    )
    invite = sharing_service.get_invite(created.grant_id, "Ada", None)
    enrolled_access.resolve_share_session(
        AccessShareSessionResolveRequest(input=invite.share_invite_url)
    )
    listed = base_registry_service.list_working_bases()
    selected = base_registry_service.select_working_base(f"shared:{created.grant_id}")

    assert f"shared:{created.grant_id}" in {item.base_ref for item in listed}
    assert selected.kind == "shared"
    assert selected.label is not None


def test_expired_accepted_share_is_not_a_working_base(
    sharing_service: SharingService,
    enrolled_access: AccessService,
    base_registry_service: BaseRegistryService,
) -> None:
    sharing_service._access_service = enrolled_access
    base_registry_service._access_service = enrolled_access
    created = sharing_service.create_grant(
        ShareGrantCreateRequest(
            owner_actor_ref="device:owner-one",
            recipient_account_id="alice",
            permission=ShareGrantPermission.READ,
            expires_at="2020-01-01T00:00:00Z",
        )
    )
    invite = sharing_service.get_invite(created.grant_id, "Ada", None)
    enrolled_access.resolve_share_session(
        AccessShareSessionResolveRequest(input=invite.share_invite_url)
    )
    listed = base_registry_service.list_working_bases()

    assert f"shared:{created.grant_id}" not in {item.base_ref for item in listed}

    try:
        base_registry_service.select_working_base(f"shared:{created.grant_id}")
    except WorkingBaseNotFoundError:
        return

    raise AssertionError("expected WorkingBaseNotFoundError")


def test_admin_recipient_backup(
    sharing_service: SharingService,
    enrolled_access: AccessService,
) -> None:
    sharing_service._access_service = enrolled_access
    created = sharing_service.create_grant(
        ShareGrantCreateRequest(
            owner_actor_ref="device:owner-one",
            recipient_account_id="alice",
            permission=ShareGrantPermission.ADMIN,
        )
    )
    invite = sharing_service.get_invite(created.grant_id, "Ada", None)
    enrolled_access.resolve_share_session(
        AccessShareSessionResolveRequest(input=invite.share_invite_url)
    )
    backup = sharing_service.backup_recipient(created.grant_id, "manual")
    recipients = sharing_service.list_recipient_view(
        recipient_actor_ref="account:alice",
        recipient_account_id=None,
        include_inactive=False,
        evaluation_at=None,
    )

    assert backup.filename.startswith("locram-manual-")
    assert backup.filename.endswith(".db")
    assert backup.path is not None
    assert recipients[0].authority_available is True
    assert recipients[0].authority_db_path is not None
    assert recipients[0].base_stats is not None
