from datetime import UTC, datetime
from pathlib import Path

from ulid import ULID

import database
from database import open_knowledge_session
from exceptions.pages import PageNotFoundError
from exceptions.sharing import (
    SharedBaseRequestError,
    SharedBaseSessionError,
    ShareGrantNotFoundError,
    ShareReacceptRequiredError,
    SharingError,
    SharingNotReadyError,
    SharingTargetError,
)
from interfaces.repositories.bases import IBaseRegistryRepository
from interfaces.repositories.sharing import ISharingRepository
from interfaces.services.access import AccessHttpClient, IAccessService
from interfaces.services.sharing import ISharingService
from models.bases import RegistryEntry
from models.links import Link
from models.pages import Page
from models.sharing import BaseShareGrant
from repositories.backups import BackupRepository
from repositories.links import LinkRepository
from repositories.pages import PageRepository
from repositories.sharing import ShareSession
from schemas.access import AcceptedShareRecord, DesktopCapability, InviteMintRequest
from schemas.links import LinkType
from schemas.pages import PageSearchHit, PageStatus, PageType, PageUpdate
from schemas.sharing import (
    BaseShareSessionRequest,
    BaseShareSessionResult,
    BaseShareStats,
    OwnerShareManagementItem,
    RecipientBackupResult,
    RecipientShareViewItem,
    RemotePageDetail,
    ShareActivationState,
    ShareGrantCreateRequest,
    ShareGrantDeletedResponse,
    ShareGrantPermission,
    ShareGrantRecord,
    ShareGrantState,
    ShareInvite,
)
from services.backups import BackupService
from services.links import LinkService
from services.pages import PageService


class SharingService(ISharingService):
    def __init__(
        self,
        sharing_repository: ISharingRepository,
        base_registry_repository: IBaseRegistryRepository,
        access_service: IAccessService,
        http_client: AccessHttpClient,
    ) -> None:
        self._sharing_repository = sharing_repository
        self._base_registry_repository = base_registry_repository
        self._access_service = access_service
        self._http_client = http_client

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
        actor_ref = (recipient_actor_ref or "").strip()
        account_id = (recipient_account_id or "").strip()

        if actor_ref == "" and account_id == "":
            raise SharingError("recipient_actor_ref or recipient_account_id is required")

        items: list[RecipientShareViewItem] = []

        for share in self._access_service.list_accepted_shares():
            if not self._matches_recipient(share, actor_ref, account_id):
                continue

            item = self._recipient_item(share, evaluation_at)

            if not include_inactive and item.grant_state is not ShareGrantState.ACTIVE:
                continue

            items.append(item)

        return items

    def create_grant(self, payload: ShareGrantCreateRequest) -> ShareGrantRecord:
        self._access_service.deny_without_capability(DesktopCapability.SHARE_BASE)
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

    def get_invite(
        self,
        grant_id: str,
        owner_display_name: str | None,
        message: str | None,
    ) -> ShareInvite:
        grant = self._sharing_repository.get(grant_id)

        if grant is None:
            raise ShareGrantNotFoundError(grant_id)

        if grant.revoked_at is not None:
            raise SharingError("Cannot mint an invite for a revoked grant")

        entry = self._registry_entry_for_grant(grant)
        share_base_title = entry.display_name if entry is not None else grant.base_id
        recipient_account_id = None

        if grant.recipient_actor_ref.startswith("account:"):
            recipient_account_id = grant.recipient_actor_ref.removeprefix("account:") or None

        invite = self._access_service.mint_invite(
            InviteMintRequest(
                grant_id=grant.grant_id,
                recipient_actor_ref=grant.recipient_actor_ref,
                recipient_account_id=recipient_account_id,
                share_base_id=grant.base_id,
                share_entry_id=grant.entry_id,
                share_base_title=share_base_title,
                permission=grant.permission,
                grant_created_at=grant.created_at,
                owner_display_name=owner_display_name,
                expires_at=grant.expires_at,
                message=message,
            )
        )
        grant.last_invited_at = self._now()
        self._sharing_repository.save(grant)
        return invite

    def set_recipient_mcp_visibility(
        self,
        grant_id: str,
        visible_in_mcp: bool,
    ) -> RecipientShareViewItem:
        share = self._accepted_share(grant_id)
        updated = share.model_copy(update={"visible_in_mcp": visible_in_mcp})
        return self._recipient_item(self._access_service.update_accepted_share(updated), None)

    def rename_recipient(self, grant_id: str, share_base_title: str) -> RecipientShareViewItem:
        title = share_base_title.strip()

        if title == "":
            raise SharingError("share_base_title is required")

        share = self._accepted_share(grant_id)
        updated = share.model_copy(update={"share_base_title": title})
        return self._recipient_item(self._access_service.update_accepted_share(updated), None)

    def remove_recipient(self, grant_id: str) -> ShareGrantDeletedResponse:
        self._accepted_share(grant_id)
        self._access_service.remove_accepted_share(grant_id)
        return ShareGrantDeletedResponse(removed=True, grant_id=grant_id)

    def backup_recipient(self, grant_id: str, trigger: str) -> RecipientBackupResult:
        self._access_service.deny_without_capability(DesktopCapability.SHARE_BASE)
        share = self._accepted_share(grant_id)

        if share.permission is not ShareGrantPermission.ADMIN:
            raise SharingError("Admin permission is required")

        source = self._share_source_path(share)

        if source is None:
            source = self._materialize_share_mirror(share)

        record = BackupService(BackupRepository(source)).create_backup(trigger)

        return RecipientBackupResult(filename=record.filename, path=record.path)

    def run_session(self, payload: BaseShareSessionRequest) -> BaseShareSessionResult:
        grant_id = payload.transport_envelope.base_share_grant_id.strip()
        recipient_actor_ref = payload.recipient_actor_ref.strip()
        operation = payload.operation.strip()

        if grant_id == "" or recipient_actor_ref == "" or operation == "":
            raise SharedBaseSessionError(
                "invalid_request",
                "operation, base_share_grant_id, and recipient_actor_ref are required",
                400,
            )

        grant = self._sharing_repository.get(grant_id)

        if grant is None:
            raise SharedBaseSessionError(
                "not_found",
                f"Base share grant {grant_id} not found",
                404,
            )

        if grant.recipient_actor_ref != recipient_actor_ref:
            raise SharedBaseSessionError(
                "working_base_forbidden",
                "Remote shared base access was denied.",
                403,
            )

        if grant.revoked_at is not None:
            raise SharedBaseSessionError(
                "working_base_forbidden",
                "Remote shared base access was denied.",
                403,
            )

        if self._grant_state(grant, None) is ShareGrantState.EXPIRED:
            raise SharedBaseSessionError(
                "working_base_forbidden",
                "Remote shared base access was denied.",
                403,
            )

        required = (payload.required_permission or "").strip().lower()

        if (
            operation == "update_page" or required == ShareGrantPermission.WRITE.value
        ) and grant.permission is ShareGrantPermission.READ:
            raise SharedBaseSessionError(
                "working_base_forbidden",
                "Remote shared base access was denied.",
                403,
            )

        if operation == "validate":
            entry = self._registry_entry_for_grant(grant)
            title = entry.display_name if entry is not None else grant.base_id

            return BaseShareSessionResult(
                session_state="ready",
                share_base_title=title,
                owner_display_name=grant.owner_actor_ref,
                permission=grant.permission.value,
            )

        if operation == "activate":
            if grant.activated_at is None:
                grant.activated_at = payload.activated_at or self._now()
                grant = self._sharing_repository.save(grant)

            return BaseShareSessionResult(
                session_state="ready",
                activated_at=grant.activated_at,
            )

        entry = self._registry_entry_for_grant(grant)

        if entry is None or entry.path == "":
            raise SharedBaseSessionError(
                "unavailable",
                "Shared base unavailable in current runtime.",
                409,
            )

        if operation == "base_stats":
            return BaseShareSessionResult(
                session_state="ready",
                stats=self._read_base_stats(Path(entry.path)),
            )

        session = open_knowledge_session(Path(entry.path))

        try:
            page_repository = PageRepository(session)
            link_repository = LinkRepository(session)
            pages = PageService(page_repository, link_repository)
            links = LinkService(link_repository, page_repository)

            return self._run_page_operation(pages, links, payload, operation)
        finally:
            session.close()

    def _run_page_operation(
        self,
        pages: PageService,
        links: LinkService,
        payload: BaseShareSessionRequest,
        operation: str,
    ) -> BaseShareSessionResult:
        if operation == "list_pages":
            parent_id = payload.parent_id or "root"
            roots_only = parent_id == "root"
            items = pages.list_pages(
                status=PageStatus.ACTIVE,
                parent_id=None if roots_only else parent_id,
                roots_only=roots_only,
                limit=payload.limit or 10_000,
                offset=payload.offset or 0,
            )

            return BaseShareSessionResult(session_state="ready", items=items)

        if operation == "get_page":
            page_id = (payload.page_id or "").strip()

            if page_id == "":
                raise SharedBaseSessionError("invalid_request", "page_id is required", 400)

            try:
                item = pages.get_page(page_id)
            except PageNotFoundError as error:
                raise SharedBaseSessionError(
                    "not_found",
                    f"Page {page_id} not found",
                    404,
                ) from error

            if item.status is PageStatus.TO_DELETE:
                raise SharedBaseSessionError("not_found", f"Page {page_id} not found", 404)

            return BaseShareSessionResult(session_state="ready", item=item)

        if operation == "get_page_graph":
            page_id = (payload.page_id or "").strip()

            if page_id == "":
                raise SharedBaseSessionError("invalid_request", "page_id is required", 400)

            try:
                item = pages.get_page(page_id)
                graph = links.get_page_graph(page_id, payload.expand_hops or 1)
            except PageNotFoundError as error:
                raise SharedBaseSessionError(
                    "not_found",
                    f"Page {page_id} not found",
                    404,
                ) from error

            if item.status is PageStatus.TO_DELETE:
                raise SharedBaseSessionError("not_found", f"Page {page_id} not found", 404)

            return BaseShareSessionResult(session_state="ready", item=graph)

        if operation == "search_pages":
            query = (payload.query or "").strip()
            hits: list[PageSearchHit] = []

            if query != "":
                hits = pages.search_pages(query, payload.limit or 20)

            return BaseShareSessionResult(session_state="ready", items=hits)

        if operation == "update_page":
            page_id = (payload.page_id or "").strip()
            fields = payload.fields

            if page_id == "" or fields is None:
                raise SharedBaseSessionError(
                    "invalid_request",
                    "page_id and fields are required",
                    400,
                )

            if fields.title is not None and fields.title.strip() == "":
                raise SharedBaseSessionError(
                    "invalid_request",
                    "Field 'title' cannot be blank",
                    400,
                )

            if fields.title is None and fields.content is None:
                raise SharedBaseSessionError(
                    "invalid_request",
                    "No editable fields provided",
                    400,
                )

            try:
                item = pages.update_page(
                    page_id,
                    PageUpdate(title=fields.title, content=fields.content),
                )
            except PageNotFoundError as error:
                raise SharedBaseSessionError(
                    "not_found",
                    f"Page {page_id} not found",
                    404,
                ) from error

            return BaseShareSessionResult(session_state="ready", item=item)

        raise SharedBaseSessionError("unsupported_operation", "unsupported_operation", 400)

    def _accepted_share(self, grant_id: str) -> AcceptedShareRecord:
        share = self._access_service.get_accepted_share(grant_id)

        if share is None:
            raise ShareGrantNotFoundError(grant_id)

        return share

    def _recipient_item(
        self,
        share: AcceptedShareRecord,
        evaluation_at: str | None,
    ) -> RecipientShareViewItem:
        grant_state = ShareGrantState.ACTIVE

        if share.session_state == "revoked":
            grant_state = ShareGrantState.REVOKED
        elif share.expires_at is not None:
            expires_at = self._parse_timestamp(share.expires_at)
            compared_at = self._parse_timestamp(evaluation_at or self._now())

            if expires_at <= compared_at:
                grant_state = ShareGrantState.EXPIRED

        source = self._share_source_path(share)

        return RecipientShareViewItem(
            grant_id=share.grant_id,
            owner_actor_ref=share.owner_actor_ref,
            recipient_actor_ref=share.recipient_actor_ref,
            base_id=share.share_base_id,
            entry_id=share.share_entry_id,
            permission=share.permission,
            created_at=share.grant_created_at or share.accepted_at,
            last_invited_at=None,
            activated_at=share.accepted_at,
            expires_at=share.expires_at,
            revoked_at=None,
            revocation_reason=None,
            recipient_account_id=share.recipient_account_id,
            share_base_title=share.share_base_title,
            owner_display_name=share.owner_display_name,
            grant_state=grant_state,
            activation_state=ShareActivationState.ACTIVE,
            session_state=share.session_state,
            visible_in_mcp=share.visible_in_mcp,
            base_stats=self._stats_for_share(share, source),
            authority_db_path=str(source) if source is not None else None,
            authority_available=source is not None,
        )

    @staticmethod
    def _matches_recipient(
        share: AcceptedShareRecord,
        actor_ref: str,
        account_id: str,
    ) -> bool:
        if actor_ref != "" and share.recipient_actor_ref == actor_ref:
            return True

        if account_id != "" and share.recipient_account_id == account_id:
            return True

        return account_id != "" and share.recipient_actor_ref == f"account:{account_id}"

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

        source = Path(entry.path) if entry is not None and entry.path != "" else None
        stats = None

        if source is not None and source.is_file():
            stats = self._read_base_stats(source)

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
            base_stats=stats,
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

    def _share_source_path(self, share: AcceptedShareRecord) -> Path | None:
        grant = self._sharing_repository.get(share.grant_id)

        if grant is not None:
            entry = self._registry_entry_for_grant(grant)

            if entry is not None:
                path = Path(entry.path)

                if path.is_file():
                    return path

        if share.share_entry_id is not None and share.share_entry_id != "":
            entry = self._base_registry_repository.get(share.share_entry_id)

            if entry is not None:
                path = Path(entry.path)

                if path.is_file():
                    return path

        return None

    def _stats_for_share(
        self,
        share: AcceptedShareRecord,
        source: Path | None,
    ) -> BaseShareStats | None:
        if source is not None:
            return self._read_base_stats(source)

        try:
            return ShareSession(
                share,
                share.recipient_actor_ref,
                self._http_client,
            ).base_stats()
        except (
            SharedBaseRequestError,
            SharedBaseSessionError,
            ShareReacceptRequiredError,
        ):
            return None

    def _materialize_share_mirror(self, share: AcceptedShareRecord) -> Path:
        session = ShareSession(share, share.recipient_actor_ref, self._http_client)
        pages = self._collect_remote_pages(session)

        if not pages:
            raise SharingNotReadyError("Shared base unavailable in current runtime.")

        destination = database.shared_mirrors_path / f"{share.grant_id}.db"
        destination.parent.mkdir(parents=True, exist_ok=True)

        if destination.is_file():
            destination.unlink()

        knowledge = open_knowledge_session(destination)

        try:
            added: set[str] = set()
            remaining = list(pages)

            while remaining:
                ready = [
                    page
                    for page in remaining
                    if page.parent_id is None or page.parent_id in added
                ]

                if not ready:
                    ready = remaining

                for page in ready:
                    parent_id = page.parent_id

                    if parent_id is not None and parent_id not in added:
                        parent_id = None

                    knowledge.add(self._page_from_remote(page, parent_id))
                    added.add(page.id)

                remaining = [page for page in remaining if page.id not in added]

            knowledge.flush()

            seen: set[tuple[str, str, str]] = set()

            for page in pages:
                for connection in page.connected_to:
                    if connection.direction == "incoming":
                        source_id = connection.id
                        target_id = page.id
                    else:
                        source_id = page.id
                        target_id = connection.id

                    key = (source_id, target_id, connection.link_type)

                    if key in seen or source_id not in added or target_id not in added:
                        continue

                    seen.add(key)
                    knowledge.add(
                        Link(
                            source_id=source_id,
                            target_id=target_id,
                            link_type=LinkType(connection.link_type),
                            created_at=self._now(),
                        )
                    )

            knowledge.commit()
        finally:
            knowledge.close()

        return destination

    def _collect_remote_pages(self, session: ShareSession) -> list[RemotePageDetail]:
        pages: list[RemotePageDetail] = []
        pending = ["root"]
        seen_parents: set[str] = set()

        while pending:
            parent_id = pending.pop(0)

            if parent_id in seen_parents:
                continue

            seen_parents.add(parent_id)
            items = session.list_pages(parent_id, 10_000, 0)

            for item in items:
                detail = session.get_page(item.id)

                if detail is None:
                    continue

                pages.append(detail)
                pending.append(item.id)

        return pages

    @staticmethod
    def _page_from_remote(page: RemotePageDetail, parent_id: str | None) -> Page:
        return Page(
            id=page.id,
            title=page.title,
            content=page.content,
            type=PageType(page.type),
            status=PageStatus(page.status),
            subject=page.subject,
            tags=page.tags,
            parent_id=parent_id,
            content_hash=page.content_hash,
            review_interval_days=page.review_interval_days,
            created_at=page.created_at,
            updated_at=page.updated_at,
            reviewed_at=page.reviewed_at,
        )

    @staticmethod
    def _read_base_stats(path: Path) -> BaseShareStats:
        return BaseShareStats.model_validate(
            BackupRepository(source_path=path).read_stats(path).model_dump()
        )

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
