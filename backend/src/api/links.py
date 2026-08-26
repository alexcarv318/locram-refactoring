from fastapi import APIRouter, Depends

from dependencies import get_link_service, get_writable_working_base
from interfaces.services.links import ILinkService
from schemas.bases import WorkingBaseRecord
from schemas.links import (
    BatchLinkResult,
    LinkBatchCreate,
    LinkCreate,
    LinkedPagesResponse,
    LinkType,
    UnlinkedPagesResponse,
)

links_router = APIRouter(prefix="/api/links")


@links_router.post("", response_model=LinkedPagesResponse, status_code=201)
def link_pages(
    payload: LinkCreate,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    link_service: ILinkService = Depends(get_link_service),
) -> LinkedPagesResponse:
    return link_service.link_pages(
        payload.source_id,
        payload.target_id,
        payload.link_type,
    )


@links_router.delete("", response_model=UnlinkedPagesResponse)
def unlink_pages(
    source_id: str,
    target_id: str,
    link_type: LinkType | None = None,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    link_service: ILinkService = Depends(get_link_service),
) -> UnlinkedPagesResponse:
    return link_service.unlink_pages(source_id, target_id, link_type)


@links_router.post("/batch", response_model=BatchLinkResult)
def batch_link(
    payload: LinkBatchCreate,
    working_base: WorkingBaseRecord = Depends(get_writable_working_base),
    link_service: ILinkService = Depends(get_link_service),
) -> BatchLinkResult:
    return link_service.batch_link(payload.links)
