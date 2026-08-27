from datetime import UTC, datetime
from typing import Never

from ulid import ULID

from exceptions.sharing import (
    ShareGrantNotFoundError,
    SharingError,
    SharingNotReadyError,
    SharingTargetError,
)
from interfaces.repositories.bases import IBaseRegistryRepository
from interfaces.repositories.sharing import ISharingRepository
from interfaces.services.sharing import ISharingService
from models.bases import RegistryEntry
from models.sharing import BaseShareGrant
from schemas.sharing import (
    OwnerShareManagementItem,
    RecipientShareViewItem,
    ShareActivationState,
    ShareGrantCreateRequest,
    ShareGrantDeletedResponse,
    ShareGrantRecord,
    ShareGrantState,
)


class SharingService(ISharingService):
    def __init__(
        self,
        sharing_repository: ISharingRepository,
        base_registry_repository: IBaseRegistryRepository,
    ) -> None:
        self._sharing_repository = sharing_repository
        self._base_registry_repository = base_registry_repository

    def list_owner_view(
        self,
        owner_actor_ref: str,
        evaluation_at: str | None,
        base_id: str | None,
        entry_id: str | None,
    ) -> list[OwnerShareManagementItem]:
        owner_actor_ref = owner_actor_ref.strip()

        if owner_actor_ref == "":
            raise SharingError("owner_actor_ref is required")

        items: list[OwnerShareManagementItem] = []

        for grant in self._sharing_repository.list_owner(owner_actor_ref):
            if base_id is not None and grant.base_id != base_id:
                continue

            if entry_id is not None and grant.entry_id != entry_id:
                continue

            items.append(self._owner_item(grant, evaluation_at))

        return items

    def list_recipient_view(
        self,
        recipient_actor_ref: str | None,
        recipient_account_id: str | None,
        include_inactive: bool,
        evaluation_at: str | None,
    ) -> list[RecipientShareViewItem]:
        if (recipient_actor_ref or "").strip() == "" and (
            recipient_account_id or ""
        ).strip() == "":
            raise SharingError("recipient_actor_ref or recipient_account_id is required")

        return []

    def create_grant(self, payload: ShareGrantCreateRequest) -> ShareGrantRecord:
        owner_actor_ref = payload.owner_actor_ref.strip()
        recipient_actor_ref = (payload.recipient_actor_ref or "").strip()
        recipient_account_id = (payload.recipient_account_id or "").strip()

        if owner_actor_ref == "":
            raise SharingError("owner_actor_ref is required")

        if recipient_actor_ref == "" and recipient_account_id == "":
            raise SharingError("recipient_actor_ref or recipient_account_id is required")

        if recipient_actor_ref == "":
            recipient_actor_ref = f"account:{recipient_account_id}"
        elif not recipient_actor_ref.startswith("account:") and not recipient_actor_ref.startswith(
            "device:"
        ):
            recipient_actor_ref = f"account:{recipient_actor_ref}"

        if owner_actor_ref == recipient_actor_ref:
            raise SharingError("owner_actor_ref and recipient_actor_ref must differ")

        if payload.expires_at is not None:
            self._parse_timestamp(payload.expires_at)

        entry = self._target_registry_entry(payload.entry_id, payload.base_id)

        grant = self._sharing_repository.save(
            BaseShareGrant(
                grant_id=str(ULID()),
                owner_actor_ref=owner_actor_ref,
                recipient_actor_ref=recipient_actor_ref,
                base_id=entry.base_id,
                entry_id=entry.entry_id,
                permission=payload.permission,
                created_at=self._now(),
                expires_at=payload.expires_at,
            )
        )

        return ShareGrantRecord.model_validate(grant)

    def revoke_grant(self, grant_id: str, revocation_reason: str | None) -> ShareGrantRecord:
        grant = self._sharing_repository.get(grant_id)

        if grant is None:
            raise ShareGrantNotFoundError(grant_id)

        if grant.revoked_at is None:
            grant.revoked_at = self._now()
            grant.revocation_reason = revocation_reason
            grant = self._sharing_repository.save(grant)

        return ShareGrantRecord.model_validate(grant)

    def delete_grant(self, grant_id: str) -> ShareGrantDeletedResponse:
        grant = self._sharing_repository.get(grant_id)

        if grant is None:
            raise ShareGrantNotFoundError(grant_id)

        self._sharing_repository.delete(grant_id)

        return ShareGrantDeletedResponse(removed=True, grant_id=grant_id)

    def get_invite(self, grant_id: str) -> Never:
        grant = self._sharing_repository.get(grant_id)

        if grant is None:
            raise ShareGrantNotFoundError(grant_id)

        raise SharingNotReadyError("Invite minting needs Access")

    def set_recipient_mcp_visibility(self, grant_id: str, visible_in_mcp: bool) -> Never:
        raise SharingNotReadyError("Recipient shares need Access")

    def rename_recipient(self, grant_id: str, share_base_title: str) -> Never:
        raise SharingNotReadyError("Recipient shares need Access")

    def remove_recipient(self, grant_id: str) -> Never:
        raise SharingNotReadyError("Recipient shares need Access")

    def backup_recipient(self, grant_id: str, trigger: str) -> Never:
        raise SharingNotReadyError("Recipient shares need Access")

    def _target_registry_entry(
        self,
        entry_id: str | None,
        base_id: str | None,
    ) -> RegistryEntry:
        entry_id = (entry_id or "").strip()
        base_id = (base_id or "").strip()

        if entry_id != "":
            entry = self._base_registry_repository.get(entry_id)

            if entry is None:
                raise SharingTargetError("an active base is required")

            return entry

        if base_id != "":
            for entry in self._base_registry_repository.list_entries():
                if entry.base_id == base_id:
                    return entry

            raise SharingTargetError("an active base is required")

        entry = self._base_registry_repository.get_active()

        if entry is None:
            raise SharingTargetError("an active base is required")

        return entry

    def _owner_item(
        self,
        grant: BaseShareGrant,
        evaluation_at: str | None,
    ) -> OwnerShareManagementItem:
        entry = self._registry_entry_for_grant(grant)
        recipient_account_id = None

        if grant.recipient_actor_ref.startswith("account:"):
            account_id = grant.recipient_actor_ref.removeprefix("account:")

            if account_id != "":
                recipient_account_id = account_id

        return OwnerShareManagementItem(
            grant_id=grant.grant_id,
            owner_actor_ref=grant.owner_actor_ref,
            recipient_actor_ref=grant.recipient_actor_ref,
            base_id=grant.base_id,
            entry_id=grant.entry_id,
            permission=grant.permission,
            created_at=grant.created_at,
            last_invited_at=grant.last_invited_at,
            activated_at=grant.activated_at,
            expires_at=grant.expires_at,
            revoked_at=grant.revoked_at,
            revocation_reason=grant.revocation_reason,
            recipient_account_id=recipient_account_id,
            share_base_title=entry.display_name if entry is not None else None,
            grant_state=self._grant_state(grant, evaluation_at),
            activation_state=self._activation_state(grant),
            registered_at=entry.created_at if entry is not None else None,
            base_path=entry.path if entry is not None else None,
        )

    def _registry_entry_for_grant(self, grant: BaseShareGrant) -> RegistryEntry | None:
        if grant.entry_id is not None:
            entry = self._base_registry_repository.get(grant.entry_id)

            if entry is not None:
                return entry

        for entry in self._base_registry_repository.list_entries():
            if entry.base_id == grant.base_id:
                return entry

        return None

    def _grant_state(self, grant: BaseShareGrant, evaluation_at: str | None) -> ShareGrantState:
        if grant.revoked_at is not None:
            return ShareGrantState.REVOKED

        if grant.expires_at is None:
            return ShareGrantState.ACTIVE

        expires_at = self._parse_timestamp(grant.expires_at)
        compared_at = self._parse_timestamp(evaluation_at or self._now())

        if expires_at <= compared_at:
            return ShareGrantState.EXPIRED

        return ShareGrantState.ACTIVE

    @staticmethod
    def _activation_state(grant: BaseShareGrant) -> ShareActivationState:
        if grant.activated_at is not None:
            return ShareActivationState.ACTIVE

        if grant.last_invited_at is not None:
            return ShareActivationState.PENDING

        return ShareActivationState.CREATED

    @staticmethod
    def _parse_timestamp(value: str) -> datetime:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise SharingError(f"invalid timestamp: {value}") from error

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
