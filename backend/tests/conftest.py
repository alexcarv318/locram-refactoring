from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

import database
import mcp.bases as mcp_bases
import mcp.links as mcp_links
import mcp.pages as mcp_pages
import services.bases as bases_state
from api.main import app
from database import apply_migrations, create_session_factory, create_sqlite_engine
from dependencies import (
    get_base_registry_service,
    get_engine,
    get_link_service,
    get_page_service,
    get_registry_engine,
)
from repositories.bases import BaseRegistryRepository
from repositories.links import LinkRepository
from repositories.pages import PageRepository
from services.bases import BaseRegistryService
from services.links import LinkService
from services.pages import PageService


@pytest.fixture(autouse=True)
def isolated_locram_home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setattr(database, "host_state_path", tmp_path / "host-state.db")
    monkeypatch.setattr(database, "knowledge_path", tmp_path / "locram.db")
    get_engine.cache_clear()
    get_registry_engine.cache_clear()
    bases_state.selected_working_entry_id = None

    yield

    get_engine.cache_clear()
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
def base_registry_service() -> BaseRegistryService:
    session = create_session_factory(get_registry_engine())()
    return BaseRegistryService(BaseRegistryRepository(session))


@pytest.fixture
def client(
    services: tuple[PageService, LinkService],
    base_registry_service: BaseRegistryService,
) -> Iterator[TestClient]:
    page_service, link_service = services
    app.dependency_overrides[get_page_service] = lambda: page_service
    app.dependency_overrides[get_link_service] = lambda: link_service
    app.dependency_overrides[get_base_registry_service] = lambda: base_registry_service

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def mcp_page_service(page_service: PageService) -> Iterator[PageService]:
    previous = mcp_pages.get_page_service
    mcp_pages.get_page_service = lambda: page_service

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
    mcp_pages.get_page_service = lambda: page_service
    mcp_links.get_link_service = lambda: link_service
    mcp_links.get_page_service = lambda: page_service

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
