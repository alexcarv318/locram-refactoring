from dependencies import get_link_repository, get_page_repository, get_session
from dependencies import get_link_service as load_link_service
from dependencies import get_page_service as load_page_service
from interfaces.services.links import ILinkService
from interfaces.services.pages import IPageService
from schemas.links import (
    BatchLinkResult,
    LinkCreate,
    LinkedPagesResponse,
    LinkType,
    ParentSetResponse,
    UnlinkedPagesResponse,
)

from .protocol import MCPServerApp


def get_link_service(base_ref: str | None = None, write: bool = False) -> ILinkService:
    db = get_session(base_ref, write)
    return load_link_service(get_link_repository(db), get_page_repository(db))


def get_page_service(base_ref: str | None = None, write: bool = False) -> IPageService:
    db = get_session(base_ref, write)
    return load_page_service(get_page_repository(db), get_link_repository(db))


def link_pages(
    source_id: str,
    target_id: str,
    link_type: LinkType = LinkType.RELATED,
    base_ref: str | None = None,
) -> LinkedPagesResponse:
    return get_link_service(base_ref, write=True).link_pages(source_id, target_id, link_type)


def unlink_pages(
    source_id: str,
    target_id: str,
    link_type: LinkType | None = None,
    base_ref: str | None = None,
) -> UnlinkedPagesResponse:
    return get_link_service(base_ref, write=True).unlink_pages(source_id, target_id, link_type)


def batch_link(links: list[LinkCreate], base_ref: str | None = None) -> BatchLinkResult:
    return get_link_service(base_ref, write=True).batch_link(links)


def set_parent(
    child_id: str,
    parent_id: str | None,
    base_ref: str | None = None,
) -> ParentSetResponse:
    return get_page_service(base_ref, write=True).set_parent(child_id, parent_id)


def register(mcp: MCPServerApp) -> None:
    mcp.tool()(link_pages)
    mcp.tool()(unlink_pages)
    mcp.tool()(batch_link)
    mcp.tool()(set_parent)
