from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

import database
import mcp.attachments as mcp_attachments
import mcp.backups as mcp_backups
import mcp.bases as mcp_bases
import mcp.embeddings as mcp_embeddings
import mcp.exports as mcp_exports
import mcp.links as mcp_links
import mcp.merges as mcp_merges
import mcp.pages as mcp_pages
import mcp.smart_folders as mcp_smart_folders
import services.bases as bases_state
from api.main import app
from database import (
    apply_migrations,
    create_session_factory,
    create_sqlite_engine,
    open_knowledge_session,
)
from dependencies import (
    get_attachment_service,
    get_base_registry_service,
    get_embedding_service,
    get_link_service,
    get_page_service,
    get_registry_engine,
    get_smart_folder_service,
)
from models.bases import BaseMetadata
from repositories.backups import BackupRepository
from repositories.bases import BaseRegistryRepository
from repositories.embeddings import EmbeddingRepository
from repositories.exports import ExportRepository
from repositories.links import LinkRepository
from repositories.merges import MergeRepository
from repositories.pages import PageRepository
from repositories.smart_folders import SmartFolderRepository
from schemas.links import LinkType
from schemas.pages import PageCreate
from services.attachments import AttachmentService
from services.backups import BackupService
from services.bases import BaseRegistryService
from services.embeddings import EmbeddingService, NullEmbeddingProvider
from services.exports import ExportService
from services.links import LinkService
from services.merges import MergeService
from services.pages import PageService
from services.smart_folders import SmartFolderService


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
    database.knowledge_engines.clear()
    get_registry_engine.cache_clear()
    bases_state.selected_working_entry_id = None

    yield

    database.knowledge_engines.clear()
    get_registry_engine.cache_clear()
    bases_state.selected_working_entry_id = None


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
    mcp_pages.get_page_service = lambda base_ref=None, write=False: page_service

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
    mcp_pages.get_page_service = lambda base_ref=None, write=False: page_service
    mcp_links.get_link_service = lambda base_ref=None, write=False: link_service
    mcp_links.get_page_service = lambda base_ref=None, write=False: page_service

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
    mcp_smart_folders.get_smart_folder_service = lambda base_ref=None, write=False: (
        smart_folder_service
    )

    yield smart_folder_service

    mcp_smart_folders.get_smart_folder_service = previous


@pytest.fixture
def mcp_embedding_service(
    embedding_service: EmbeddingService,
) -> Iterator[EmbeddingService]:
    previous = mcp_embeddings.get_embedding_service
    mcp_embeddings.get_embedding_service = lambda base_ref=None, write=False: embedding_service

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
    mcp_exports.get_export_service = lambda base_ref=None, write=False: export_service

    yield export_service

    mcp_exports.get_export_service = previous


@pytest.fixture
def mcp_merge_service(
    merge_bundle: tuple[MergeService, ExportService, PageService],
) -> Iterator[MergeService]:
    merge_service, _export_service, _page_service = merge_bundle
    previous = mcp_merges.get_merge_service
    mcp_merges.get_merge_service = lambda base_ref=None, write=False: merge_service

    yield merge_service

    mcp_merges.get_merge_service = previous
