from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

import mcp.links as mcp_links
import mcp.pages as mcp_pages
from api.main import app
from database import create_sqlite_engine
from dependencies import get_link_service, get_page_service
from repositories.links import LinkRepository
from repositories.pages import PageRepository
from services.links import LinkService
from services.pages import PageService


@pytest.fixture
def page_service() -> PageService:
    engine = create_sqlite_engine()

    return PageService(PageRepository(engine), LinkRepository(engine))


@pytest.fixture
def link_service() -> LinkService:
    engine = create_sqlite_engine()

    return LinkService(LinkRepository(engine), PageRepository(engine))


@pytest.fixture
def services() -> tuple[PageService, LinkService]:
    engine = create_sqlite_engine()
    page_repository = PageRepository(engine)
    link_repository = LinkRepository(engine)

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
