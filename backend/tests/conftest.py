from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

import mcp.links as mcp_links
import mcp.pages as mcp_pages
from api.main import app
from database import apply_migrations, create_session_factory, create_sqlite_engine
from dependencies import get_link_service, get_page_service
from repositories.links import LinkRepository
from repositories.pages import PageRepository
from services.links import LinkService
from services.pages import PageService


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
def client(services: tuple[PageService, LinkService]) -> Iterator[TestClient]:
    page_service, link_service = services
    app.dependency_overrides[get_page_service] = lambda: page_service
    app.dependency_overrides[get_link_service] = lambda: link_service

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
