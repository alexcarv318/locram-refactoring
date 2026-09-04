from dependencies import (
    get_link_repository,
    get_local_embedding_service,
    get_page_repository,
    get_working_base,
)
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

from .protocol import MCPServerApp, register_tools


def get_link_service(
    base_ref: str | None = None,
    write: bool = False,
    recipient_actor_ref: str | None = None,
) -> ILinkService:
    if write:
        get_working_base(base_ref, True)

    return load_link_service(
        get_link_repository(base_ref=base_ref, recipient_actor_ref=recipient_actor_ref),
        get_page_repository(base_ref=base_ref, recipient_actor_ref=recipient_actor_ref),
    )


def get_page_service(
    base_ref: str | None = None,
    write: bool = False,
    recipient_actor_ref: str | None = None,
) -> IPageService:
    if write:
        get_working_base(base_ref, True)

    return load_page_service(
        get_page_repository(base_ref=base_ref, recipient_actor_ref=recipient_actor_ref),
        get_link_repository(base_ref=base_ref, recipient_actor_ref=recipient_actor_ref),
        get_local_embedding_service(
            base_ref=base_ref,
            recipient_actor_ref=recipient_actor_ref,
        ),
    )


def link_pages(
    source_id: str,
    target_id: str,
    link_type: LinkType = LinkType.RELATED,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> LinkedPagesResponse:
    return get_link_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).link_pages(source_id, target_id, link_type)


def unlink_pages(
    source_id: str,
    target_id: str,
    link_type: LinkType | None = None,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> UnlinkedPagesResponse:
    return get_link_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).unlink_pages(source_id, target_id, link_type)


def batch_link(
    links: list[LinkCreate],
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> BatchLinkResult:
    return get_link_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).batch_link(links)


def set_parent(
    child_id: str,
    parent_id: str | None,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> ParentSetResponse:
    return get_page_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).set_parent(child_id, parent_id)


def register(mcp: MCPServerApp) -> None:
    register_tools(mcp, link_pages, unlink_pages, batch_link, set_parent)
