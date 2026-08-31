from collections.abc import Iterator
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

import database
import mcp_server.access as mcp_access
import mcp_server.attachments as mcp_attachments
import mcp_server.backups as mcp_backups
import mcp_server.bases as mcp_bases
import mcp_server.embeddings as mcp_embeddings
import mcp_server.exports as mcp_exports
import mcp_server.links as mcp_links
import mcp_server.merges as mcp_merges
import mcp_server.pages as mcp_pages
import mcp_server.sharing as mcp_sharing
import mcp_server.smart_folders as mcp_smart_folders
import services.bases as bases_state
from api.main import app
from database import (
    apply_migrations,
    create_session_factory,
    create_sqlite_engine,
    open_knowledge_session,
)
from dependencies import (
    get_access_relay,
    get_attachment_service,
    get_base_registry_service,
    get_embedding_service,
    get_link_service,
    get_page_service,
    get_registry_engine,
    get_smart_folder_service,
)
from interfaces.services.access import IAccessRelay
from interfaces.services.embeddings import IEmbeddingService
from interfaces.services.exports import IExportService
from interfaces.services.links import ILinkService
from interfaces.services.merges import IMergeService
from interfaces.services.pages import IPageService
from interfaces.services.smart_folders import ISmartFolderService
from models.bases import BaseMetadata
from repositories.access import AccessRepository
from repositories.backups import BackupRepository
from repositories.bases import BaseRegistryRepository
from repositories.embeddings import EmbeddingRepository
from repositories.exports import ExportRepository
from repositories.links import LinkRepository
from repositories.merges import MergeRepository
from repositories.pages import PageRepository
from repositories.sharing import SharingRepository
from repositories.smart_folders import SmartFolderRepository
from schemas.access import (
    AccessCredentialRecord,
    AccessEnrollRequest,
    AccessSettings,
    AccessState,
    ConnectedOAuthSession,
    PendingAuthorizationRequest,
)
from schemas.links import LinkType
from schemas.pages import PageCreate
from services.access import AccessService
from services.attachments import AttachmentService
from services.backups import BackupService
from services.bases import BaseRegistryService
from services.embeddings import EmbeddingService, NullEmbeddingProvider
from services.exports import ExportService
from services.links import LinkService
from services.merges import MergeService
from services.pages import PageService
from services.sharing import SharingService
from services.smart_folders import SmartFolderService


class ImmediateRelay(IAccessRelay):
    def __init__(self) -> None:
        self._running = False
        self._state = AccessState.UNAVAILABLE
        self._last_error: str | None = None

    def start(self, record: AccessCredentialRecord) -> None:
        self._running = True
        self._state = AccessState.LIVE
        self._last_error = None

    def stop(self) -> None:
        self._running = False
        self._state = AccessState.UNAVAILABLE

    def running(self) -> bool:
        return self._running

    def state(self) -> AccessState:
        return self._state

    def last_error(self) -> str | None:
        return self._last_error


class ScriptedAccessHttp:
    def __init__(self) -> None:
        self.enroll_status = 200
        self.enroll_body: dict[str, str | dict[str, str]] = {
            "device_id": "device-one",
            "relay_url": "wss://broker.example.test/relay",
            "relay_token": "relay-token",
            "authorization_server_url": "https://broker.example.test",
            "protected_resource_url": "https://device-one.locram.app/mcp",
            "public_mcp_url": "https://device-one.locram.app/mcp",
            "credential_generation_id": "gen-one",
            "account_identity": {
                "email": "ada@example.test",
                "display_name": "Ada",
                "account_id": "acct-one",
            },
        }
        self.pending_items: list[PendingAuthorizationRequest] = []
        self.session_items: list[ConnectedOAuthSession] = []
        self.posts: list[str] = []
        self.gets: list[str] = []

    def get(
        self,
        url: str,
        *,
        params: dict[str, str] | None = None,
        headers: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response:
        self.gets.append(url)

        if url.endswith("/api/oauth/pending-authorizations"):
            return httpx.Response(
                200,
                json={"items": [item.model_dump() for item in self.pending_items]},
            )

        if url.endswith("/api/oauth/connected-sessions"):
            return httpx.Response(
                200,
                json={"items": [item.model_dump() for item in self.session_items]},
            )

        return httpx.Response(404, json={"error": "missing"})

    def post(
        self,
        url: str,
        *,
        json: dict[str, str] | None = None,
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
        params: dict[str, str] | None = None,
        timeout: float | None = None,
    ) -> httpx.Response:
        self.posts.append(url)

        if url.endswith("/api/devices/enroll"):
            return httpx.Response(self.enroll_status, json=self.enroll_body)

        return httpx.Response(200, json={"status": "ok"})


@pytest.fixture(autouse=True)
def isolated_locram_home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setattr(database, "host_state_path", tmp_path / "host-state.db")
    monkeypatch.setattr(database, "knowledge_path", tmp_path / "locram.db")
    monkeypatch.setattr(database, "attachments_path", tmp_path / "attachments")
    monkeypatch.setattr(
        database,
        "filter_presets_path",
        tmp_path / "preferences" / "filter-presets.json",
    )
    monkeypatch.setattr(
        database,
        "embedding_settings_path",
        tmp_path / "preferences" / "embedding-settings.json",
    )
    monkeypatch.setattr(
        database,
        "huggingface_api_key_path",
        tmp_path / "preferences" / "huggingface-api-key",
    )
    monkeypatch.setattr(database, "access_path", tmp_path / "preferences" / "access.json")
    monkeypatch.setattr(
        database,
        "access_credentials_path",
        tmp_path / "preferences" / "access-credentials.json",
    )
    monkeypatch.setattr(
        database,
        "accepted_shares_path",
        tmp_path / "preferences" / "accepted-shares.json",
    )
    monkeypatch.setattr(database, "managed_bases_path", tmp_path / "managed-bases")
    monkeypatch.setattr(
        database,
        "hosted_embedding_bootstrap_path",
        tmp_path / "preferences" / "hosted-embedding-bootstrap.json",
    )
    database.knowledge_engines.clear()
    get_registry_engine.cache_clear()
    bases_state.selected_working_base_ref = None

    yield

    database.knowledge_engines.clear()
    get_registry_engine.cache_clear()
    bases_state.selected_working_base_ref = None
    get_access_relay().stop()


def create_test_engine() -> Engine:
    engine = create_sqlite_engine()
    apply_migrations(engine)
    return engine


@pytest.fixture
def db() -> Iterator[Session]:
    session = create_session_factory(create_test_engine())()

    yield session

    session.commit()
    session.close()


@pytest.fixture
def page_service(db: Session) -> PageService:
    return PageService(PageRepository(db), LinkRepository(db))


@pytest.fixture
def link_service(db: Session) -> LinkService:
    return LinkService(LinkRepository(db), PageRepository(db))


@pytest.fixture
def services(db: Session) -> tuple[PageService, LinkService]:
    page_repository = PageRepository(db)
    link_repository = LinkRepository(db)

    return (
        PageService(page_repository, link_repository),
        LinkService(link_repository, page_repository),
    )


@pytest.fixture
def embedding_service(db: Session) -> EmbeddingService:
    return EmbeddingService(
        EmbeddingRepository(db),
        PageRepository(db),
        AccessRepository(
            database.access_path,
            database.access_credentials_path,
            database.accepted_shares_path,
        ),
        NullEmbeddingProvider(),
    )


@pytest.fixture
def attachment_service(tmp_path: Path) -> AttachmentService:
    return AttachmentService(tmp_path / "attachments")


@pytest.fixture
def export_service(tmp_path: Path) -> Iterator[ExportService]:
    source_path = tmp_path / "notes.db"
    session = open_knowledge_session(source_path)
    session.add(BaseMetadata(base_id="base-one", display_name="Notes"))
    session.commit()
    page_repository = PageRepository(session)
    link_repository = LinkRepository(session)
    page_service = PageService(page_repository, link_repository)
    link_service = LinkService(link_repository, page_repository)
    first = page_service.create_page(PageCreate(title="Alpha", content="first"))
    second = page_service.create_page(
        PageCreate(title="Beta", content="second", parent_id=first.id)
    )
    page_service.create_page(PageCreate(title="Gamma", content="third"))
    link_service.link_pages(first.id, second.id, LinkType.RELATED)

    service = ExportService(
        export_repository=ExportRepository(source_path=source_path),
        page_repository=page_repository,
        smart_folder_service=SmartFolderService(
            SmartFolderRepository(tmp_path / "preferences" / "filter-presets.json"),
            page_repository,
            link_repository,
            link_service,
        ),
    )

    yield service

    session.close()


@pytest.fixture
def merge_bundle(
    tmp_path: Path,
) -> Iterator[tuple[MergeService, ExportService, PageService]]:
    source_path = tmp_path / "notes.db"
    session = open_knowledge_session(source_path)
    session.add(BaseMetadata(base_id="base-one", display_name="Notes"))
    session.commit()
    page_repository = PageRepository(session)
    link_repository = LinkRepository(session)
    page_service = PageService(page_repository, link_repository)
    link_service = LinkService(link_repository, page_repository)
    first = page_service.create_page(PageCreate(title="Alpha", content="first"))
    second = page_service.create_page(
        PageCreate(title="Beta", content="second", parent_id=first.id)
    )
    page_service.create_page(PageCreate(title="Gamma", content="third"))
    link_service.link_pages(first.id, second.id, LinkType.RELATED)

    merge_service = MergeService(
        merge_repository=MergeRepository(session),
        page_repository=page_repository,
        link_repository=link_repository,
        backup_service=BackupService(backup_repository=BackupRepository(source_path=source_path)),
    )
    export_service = ExportService(
        export_repository=ExportRepository(source_path=source_path),
        page_repository=page_repository,
        smart_folder_service=SmartFolderService(
            SmartFolderRepository(tmp_path / "preferences" / "filter-presets.json"),
            page_repository,
            link_repository,
            link_service,
        ),
    )

    yield merge_service, export_service, page_service

    session.close()


@pytest.fixture
def backup_service(tmp_path: Path) -> BackupService:
    source_path = tmp_path / "notes.db"
    session = open_knowledge_session(source_path)
    session.add(BaseMetadata(base_id="base-one", display_name="Notes"))
    session.commit()
    page_service = PageService(PageRepository(session), LinkRepository(session))
    page_service.create_page(PageCreate(title="Kept", content="original"))
    session.close()

    return BackupService(backup_repository=BackupRepository(source_path=source_path))


@pytest.fixture
def smart_folder_service(
    db: Session,
    link_service: LinkService,
    tmp_path: Path,
) -> SmartFolderService:
    return SmartFolderService(
        SmartFolderRepository(tmp_path / "preferences" / "filter-presets.json"),
        PageRepository(db),
        LinkRepository(db),
        link_service,
    )


@pytest.fixture
def base_registry_service() -> BaseRegistryService:
    session = create_session_factory(get_registry_engine())()
    return BaseRegistryService(BaseRegistryRepository(session))


@pytest.fixture
def access_service() -> AccessService:
    return AccessService(
        access_repository=AccessRepository(
            database.access_path,
            database.access_credentials_path,
            database.accepted_shares_path,
        ),
        access_relay=ImmediateRelay(),
        http_client=ScriptedAccessHttp(),
        settings=AccessSettings(),
    )


@pytest.fixture
def enrolled_access() -> AccessService:
    http_client = ScriptedAccessHttp()
    service = AccessService(
        access_repository=AccessRepository(
            database.access_path,
            database.access_credentials_path,
            database.accepted_shares_path,
        ),
        access_relay=ImmediateRelay(),
        http_client=http_client,
        settings=AccessSettings(),
    )
    service.enroll(
        AccessEnrollRequest(redemption_code="code-one", broker_base_url="https://broker.example.test")
    )
    return service


@pytest.fixture
def enrolled_access_with_pending() -> AccessService:
    http_client = ScriptedAccessHttp()
    http_client.pending_items = [
        PendingAuthorizationRequest(
            request_id="req-one",
            device_id="device-one",
            client_id="client-one",
            redirect_uri="https://app.example.test/callback",
            resource="https://device-one.locram.app/mcp",
            code_challenge="challenge",
            code_challenge_method="S256",
            status="pending",
            created_at="2026-01-01T00:00:00Z",
            expires_at="2026-01-01T01:00:00Z",
            state=None,
        )
    ]
    service = AccessService(
        access_repository=AccessRepository(
            database.access_path,
            database.access_credentials_path,
            database.accepted_shares_path,
        ),
        access_relay=ImmediateRelay(),
        http_client=http_client,
        settings=AccessSettings(),
    )
    service.enroll(
        AccessEnrollRequest(redemption_code="code-one", broker_base_url="https://broker.example.test")
    )
    return service


@pytest.fixture
def sharing_service(base_registry_service: BaseRegistryService) -> SharingService:
    base_registry_service.list_bases()
    session = create_session_factory(get_registry_engine())()

    return SharingService(
        sharing_repository=SharingRepository(session),
        base_registry_repository=BaseRegistryRepository(session),
        access_service=AccessService(
            access_repository=AccessRepository(
                database.access_path,
                database.access_credentials_path,
                database.accepted_shares_path,
            ),
            access_relay=ImmediateRelay(),
            http_client=ScriptedAccessHttp(),
            settings=AccessSettings(),
        ),
    )


@pytest.fixture
def client(
    services: tuple[PageService, LinkService],
    base_registry_service: BaseRegistryService,
    attachment_service: AttachmentService,
    smart_folder_service: SmartFolderService,
    embedding_service: EmbeddingService,
) -> Iterator[TestClient]:
    page_service, link_service = services
    app.dependency_overrides[get_page_service] = lambda: page_service
    app.dependency_overrides[get_link_service] = lambda: link_service
    app.dependency_overrides[get_base_registry_service] = lambda: base_registry_service
    app.dependency_overrides[get_attachment_service] = lambda: attachment_service
    app.dependency_overrides[get_smart_folder_service] = lambda: smart_folder_service
    app.dependency_overrides[get_embedding_service] = lambda: embedding_service

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def live_client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mcp_page_service(page_service: PageService) -> Iterator[PageService]:
    previous = mcp_pages.get_page_service

    def override(
        base_ref: str | None = None,
        write: bool = False,
        recipient_actor_ref: str | None = None,
    ) -> IPageService:
        return page_service

    mcp_pages.get_page_service = override

    yield page_service

    mcp_pages.get_page_service = previous


@pytest.fixture
def mcp_services(
    services: tuple[PageService, LinkService],
) -> Iterator[tuple[PageService, LinkService]]:
    page_service, link_service = services
    previous_page = mcp_pages.get_page_service
    previous_link = mcp_links.get_link_service
    previous_link_pages = mcp_links.get_page_service

    def override_pages(
        base_ref: str | None = None,
        write: bool = False,
        recipient_actor_ref: str | None = None,
    ) -> IPageService:
        return page_service

    def override_links(
        base_ref: str | None = None,
        write: bool = False,
        recipient_actor_ref: str | None = None,
    ) -> ILinkService:
        return link_service

    mcp_pages.get_page_service = override_pages
    mcp_links.get_link_service = override_links
    mcp_links.get_page_service = override_pages

    yield page_service, link_service

    mcp_pages.get_page_service = previous_page
    mcp_links.get_link_service = previous_link
    mcp_links.get_page_service = previous_link_pages


@pytest.fixture
def mcp_base_registry_service(
    base_registry_service: BaseRegistryService,
) -> Iterator[BaseRegistryService]:
    previous = mcp_bases.get_base_registry_service
    mcp_bases.get_base_registry_service = lambda: base_registry_service

    yield base_registry_service

    mcp_bases.get_base_registry_service = previous


@pytest.fixture
def mcp_attachment_service(
    attachment_service: AttachmentService,
) -> Iterator[AttachmentService]:
    previous = mcp_attachments.get_attachment_service
    mcp_attachments.get_attachment_service = lambda: attachment_service

    yield attachment_service

    mcp_attachments.get_attachment_service = previous


@pytest.fixture
def mcp_smart_folder_service(
    smart_folder_service: SmartFolderService,
) -> Iterator[SmartFolderService]:
    previous = mcp_smart_folders.get_smart_folder_service

    def override(
        base_ref: str | None = None,
        write: bool = False,
        recipient_actor_ref: str | None = None,
    ) -> ISmartFolderService:
        return smart_folder_service

    mcp_smart_folders.get_smart_folder_service = override

    yield smart_folder_service

    mcp_smart_folders.get_smart_folder_service = previous


@pytest.fixture
def mcp_embedding_service(
    embedding_service: EmbeddingService,
) -> Iterator[EmbeddingService]:
    previous = mcp_embeddings.get_embedding_service

    def override(
        base_ref: str | None = None,
        write: bool = False,
        recipient_actor_ref: str | None = None,
    ) -> IEmbeddingService:
        return embedding_service

    mcp_embeddings.get_embedding_service = override

    yield embedding_service

    mcp_embeddings.get_embedding_service = previous


@pytest.fixture
def mcp_backup_service(backup_service: BackupService) -> Iterator[BackupService]:
    previous = mcp_backups.get_backup_service
    mcp_backups.get_backup_service = lambda base_ref=None, write=False: backup_service

    yield backup_service

    mcp_backups.get_backup_service = previous


@pytest.fixture
def mcp_export_service(export_service: ExportService) -> Iterator[ExportService]:
    previous = mcp_exports.get_export_service

    def override(
        base_ref: str | None = None,
        write: bool = False,
        recipient_actor_ref: str | None = None,
    ) -> IExportService:
        return export_service

    mcp_exports.get_export_service = override

    yield export_service

    mcp_exports.get_export_service = previous


@pytest.fixture
def mcp_merge_service(
    merge_bundle: tuple[MergeService, ExportService, PageService],
) -> Iterator[MergeService]:
    merge_service, _export_service, _page_service = merge_bundle
    previous = mcp_merges.get_merge_service

    def override(
        base_ref: str | None = None,
        write: bool = False,
        recipient_actor_ref: str | None = None,
    ) -> IMergeService:
        return merge_service

    mcp_merges.get_merge_service = override

    yield merge_service

    mcp_merges.get_merge_service = previous


@pytest.fixture
def mcp_sharing_service(sharing_service: SharingService) -> Iterator[SharingService]:
    previous = mcp_sharing.get_sharing_service
    mcp_sharing.get_sharing_service = lambda: sharing_service

    yield sharing_service

    mcp_sharing.get_sharing_service = previous


@pytest.fixture
def mcp_access_service(access_service: AccessService) -> Iterator[AccessService]:
    previous = mcp_access.get_access_service
    mcp_access.get_access_service = lambda: access_service

    yield access_service

    mcp_access.get_access_service = previous
