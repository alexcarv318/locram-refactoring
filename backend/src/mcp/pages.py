from collections.abc import Callable
from typing import Protocol

from dependencies import get_page_service as load_page_service
from interfaces.services.pages import IPageService
from schemas.links import InlineLinkResponse
from schemas.pages import (
    PageAncestor,
    PageCreate,
    PageDeletedResponse,
    PageDetail,
    PagePromotedResponse,
    PagePurgedResponse,
    PageRestoredResponse,
    PageReviewedResponse,
    PageSearchHit,
    PageStatus,
    PageSummary,
    PageType,
    PageUpdate,
)

get_page_service: Callable[[], IPageService] = load_page_service


class MCPServerApp(Protocol):
    def tool(self) -> Callable[[Callable[..., object]], Callable[..., object]]: ...

    def run(self) -> None: ...


def create_page(
    title: str,
    content: str = "",
    type: PageType = PageType.FLEETING,
    status: PageStatus = PageStatus.ACTIVE,
    subject: list[str] | None = None,
    tags: list[str] | None = None,
    parent_id: str | None = None,
    review_interval_days: int = 7,
) -> PageDetail:
    return get_page_service().create_page(
        PageCreate(
            title=title,
            content=content,
            type=type,
            status=status,
            subject=subject or [],
            tags=tags or [],
            parent_id=parent_id,
            review_interval_days=review_interval_days,
        )
    )


def get_page(identifier: str) -> PageDetail:
    return get_page_service().get_page(identifier)


def update_page(
    page_id: str,
    title: str | None = None,
    content: str | None = None,
    type: PageType | None = None,
    status: PageStatus | None = None,
    subject: list[str] | None = None,
    tags: list[str] | None = None,
    parent_id: str | None = None,
    review_interval_days: int | None = None,
) -> PageDetail:
    payload = PageUpdate.model_validate(
        {
            key: value
            for key, value in {
                "title": title,
                "content": content,
                "type": type,
                "status": status,
                "subject": subject,
                "tags": tags,
                "parent_id": parent_id,
                "review_interval_days": review_interval_days,
            }.items()
            if value is not None
        }
    )

    return get_page_service().update_page(page_id, payload)


def delete_page(page_id: str) -> PageDeletedResponse:
    return get_page_service().delete_page(page_id)


def restore_page(page_id: str) -> PageRestoredResponse:
    return get_page_service().restore_page(page_id)


def purge_page(page_id: str) -> PagePurgedResponse:
    return get_page_service().purge_page(page_id)


def mark_reviewed(page_id: str) -> PageReviewedResponse:
    return get_page_service().mark_reviewed(page_id)


def promote_page(page_id: str) -> PagePromotedResponse:
    return get_page_service().promote_page(page_id)


def list_pages(
    status: PageStatus = PageStatus.ACTIVE,
    parent_id: str | None = None,
) -> list[PageSummary]:
    roots_only = parent_id == "root"

    return get_page_service().list_pages(
        status=status,
        parent_id=None if roots_only else parent_id,
        roots_only=roots_only,
        limit=10_000,
        offset=0,
    )


def search(query: str, limit: int = 20) -> list[PageSearchHit]:
    return get_page_service().search_pages(query, limit)


def get_page_ancestry(page_id: str) -> list[PageAncestor]:
    return get_page_service().get_page_ancestry(page_id)


def get_inline_link(page_id: str) -> InlineLinkResponse:
    return get_page_service().get_inline_link(page_id)


def register(mcp: MCPServerApp) -> None:
    mcp.tool()(create_page)
    mcp.tool()(get_page)
    mcp.tool()(update_page)
    mcp.tool()(delete_page)
    mcp.tool()(restore_page)
    mcp.tool()(purge_page)
    mcp.tool()(mark_reviewed)
    mcp.tool()(promote_page)
    mcp.tool()(list_pages)
    mcp.tool()(search)
    mcp.tool()(get_page_ancestry)
    mcp.tool()(get_inline_link)
