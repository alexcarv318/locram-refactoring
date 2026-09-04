from dependencies import (
    get_link_repository,
    get_local_embedding_service,
    get_page_repository,
    get_working_base,
)
from dependencies import get_page_service as load_page_service
from interfaces.services.pages import IPageService
from schemas.links import InlineLinkResponse
from schemas.pages import (
    PageAncestryResponse,
    PageCreate,
    PageDeletedResponse,
    PageDetail,
    PageListResponse,
    PagePromotedResponse,
    PagePurgedResponse,
    PageRestoredResponse,
    PageReviewedResponse,
    PageSearchResponse,
    PageStatus,
    PageType,
    PageUpdate,
)

from .protocol import MCPServerApp, register_tools


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


def create_page(
    title: str,
    content: str = "",
    type: PageType = PageType.FLEETING,
    status: PageStatus = PageStatus.ACTIVE,
    subject: list[str] | None = None,
    tags: list[str] | None = None,
    parent_id: str | None = None,
    review_interval_days: int = 7,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> PageDetail:
    return get_page_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).create_page(
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


def get_page(
    identifier: str,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> PageDetail:
    return get_page_service(base_ref, recipient_actor_ref=recipient_actor_ref).get_page(identifier)


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
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
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

    return get_page_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).update_page(
        page_id,
        payload,
    )


def delete_page(
    page_id: str,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> PageDeletedResponse:
    return get_page_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).delete_page(
        page_id
    )


def restore_page(
    page_id: str,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> PageRestoredResponse:
    return get_page_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).restore_page(
        page_id
    )


def purge_page(
    page_id: str,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> PagePurgedResponse:
    return get_page_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).purge_page(
        page_id
    )


def mark_reviewed(
    page_id: str,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> PageReviewedResponse:
    return get_page_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).mark_reviewed(page_id)


def promote_page(
    page_id: str,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> PagePromotedResponse:
    return get_page_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).promote_page(page_id)


def list_pages(
    status: PageStatus = PageStatus.ACTIVE,
    parent_id: str | None = None,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> PageListResponse:
    roots_only = parent_id == "root"

    return PageListResponse(
        items=get_page_service(base_ref, recipient_actor_ref=recipient_actor_ref).list_pages(
            status=status,
            parent_id=None if roots_only else parent_id,
            roots_only=roots_only,
            limit=10_000,
            offset=0,
        )
    )


def search(
    query: str,
    limit: int = 20,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> PageSearchResponse:
    return PageSearchResponse(
        items=get_page_service(base_ref, recipient_actor_ref=recipient_actor_ref).search_pages(
            query,
            limit,
        )
    )


def get_page_ancestry(
    page_id: str,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> PageAncestryResponse:
    return PageAncestryResponse(
        items=get_page_service(base_ref, recipient_actor_ref=recipient_actor_ref).get_page_ancestry(
            page_id
        )
    )


def get_inline_link(
    page_id: str,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> InlineLinkResponse:
    return get_page_service(base_ref, recipient_actor_ref=recipient_actor_ref).get_inline_link(
        page_id
    )


def replace_in_page(
    page_id: str,
    old_text: str,
    new_text: str,
    base_ref: str | None = None,
    recipient_actor_ref: str | None = None,
) -> PageDetail:
    return get_page_service(
        base_ref,
        write=True,
        recipient_actor_ref=recipient_actor_ref,
    ).replace_in_page(page_id, old_text, new_text)


def register(mcp: MCPServerApp) -> None:
    register_tools(
        mcp,
        create_page,
        get_page,
        update_page,
        delete_page,
        restore_page,
        purge_page,
        mark_reviewed,
        promote_page,
        list_pages,
        search,
        get_page_ancestry,
        get_inline_link,
        replace_in_page,
    )
