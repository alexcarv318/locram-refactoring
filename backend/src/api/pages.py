from fastapi import APIRouter, Depends, Query

from dependencies import get_link_service, get_page_service, get_writable_working_base
from interfaces.services.links import ILinkService
from interfaces.services.pages import IPageService
from schemas.bases import WorkingBaseRecord
from schemas.links import PageGraphResponse
from schemas.pages import (
    PageAncestryResponse,
    PageCreate,
    PageDeletedResponse,
    PageDetailResponse,
    PageListResponse,
    PagePromotedResponse,
    PagePurgedResponse,
    PageRestoredResponse,
    PageReviewedResponse,
    PageSearchResponse,
    PageStatus,
    PageUpdate,
)

pages_router = APIRouter(prefix="/api/pages")


@pages_router.get("", response_model=PageListResponse)
def list_pages(
    parent_id: str | None = None,
    status: PageStatus = PageStatus.ACTIVE,
    page_service: IPageService = Depends(get_page_service),
) -> PageListResponse:
    roots_only = parent_id == "root"
    resolved_parent_id = None if roots_only else parent_id

    return PageListResponse(
        items=page_service.list_pages(
            status=status,
            parent_id=resolved_parent_id,
            roots_only=roots_only,
            limit=10_000,
            offset=0,
        )
    )


@pages_router.get("/search", response_model=PageSearchResponse)
def search_pages(
    q: str = Query(default=""),
    page_service: IPageService = Depends(get_page_service),
) -> PageSearchResponse:
    return PageSearchResponse(items=page_service.search_pages(q, limit=50))


@pages_router.get("/{page_id}", response_model=PageDetailResponse)
def get_page(
    page_id: str,
    page_service: IPageService = Depends(get_page_service),
) -> PageDetailResponse:
    return PageDetailResponse(item=page_service.get_page(page_id))


@pages_router.get("/{page_id}/ancestry", response_model=PageAncestryResponse)
def get_page_ancestry(
    page_id: str,
    page_service: IPageService = Depends(get_page_service),
) -> PageAncestryResponse:
    return PageAncestryResponse(items=page_service.get_page_ancestry(page_id))


@pages_router.get("/{page_id}/graph", response_model=PageGraphResponse)
def get_page_graph(
    page_id: str,
    expand_hops: int = Query(default=2, ge=1, le=5),
    link_service: ILinkService = Depends(get_link_service),
) -> PageGraphResponse:
    return PageGraphResponse(item=link_service.get_page_graph(page_id, expand_hops))


@pages_router.post("", response_model=PageDetailResponse, status_code=201)
def create_page(
    payload: PageCreate,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    page_service: IPageService = Depends(get_page_service),
) -> PageDetailResponse:
    return PageDetailResponse(item=page_service.create_page(payload))


@pages_router.put("/{page_id}", response_model=PageDetailResponse)
def update_page(
    page_id: str,
    payload: PageUpdate,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    page_service: IPageService = Depends(get_page_service),
) -> PageDetailResponse:
    return PageDetailResponse(item=page_service.update_page(page_id, payload))


@pages_router.delete("/{page_id}", response_model=PageDeletedResponse)
def delete_page(
    page_id: str,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    page_service: IPageService = Depends(get_page_service),
) -> PageDeletedResponse:
    return page_service.delete_page(page_id)


@pages_router.post("/{page_id}/restore", response_model=PageRestoredResponse)
def restore_page(
    page_id: str,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    page_service: IPageService = Depends(get_page_service),
) -> PageRestoredResponse:
    return page_service.restore_page(page_id)


@pages_router.post("/{page_id}/purge", response_model=PagePurgedResponse)
def purge_page(
    page_id: str,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    page_service: IPageService = Depends(get_page_service),
) -> PagePurgedResponse:
    return page_service.purge_page(page_id)


@pages_router.post("/{page_id}/review", response_model=PageReviewedResponse)
def mark_reviewed(
    page_id: str,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    page_service: IPageService = Depends(get_page_service),
) -> PageReviewedResponse:
    return page_service.mark_reviewed(page_id)


@pages_router.post("/{page_id}/promote", response_model=PagePromotedResponse)
def promote_page(
    page_id: str,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    page_service: IPageService = Depends(get_page_service),
) -> PagePromotedResponse:
    return page_service.promote_page(page_id)
