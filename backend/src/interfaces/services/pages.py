from abc import ABC, abstractmethod

from schemas.links import InlineLinkResponse, ParentSetResponse
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
    PageUpdate,
)


class IPageService(ABC):
    @abstractmethod
    def create_page(self, payload: PageCreate) -> PageDetail: ...

    @abstractmethod
    def get_page(self, page_id: str) -> PageDetail: ...

    @abstractmethod
    def update_page(self, page_id: str, payload: PageUpdate) -> PageDetail: ...

    @abstractmethod
    def delete_page(self, page_id: str) -> PageDeletedResponse: ...

    @abstractmethod
    def restore_page(self, page_id: str) -> PageRestoredResponse: ...

    @abstractmethod
    def purge_page(self, page_id: str) -> PagePurgedResponse: ...

    @abstractmethod
    def mark_reviewed(self, page_id: str) -> PageReviewedResponse: ...

    @abstractmethod
    def promote_page(self, page_id: str) -> PagePromotedResponse: ...

    @abstractmethod
    def list_pages(
        self,
        status: PageStatus,
        parent_id: str | None,
        roots_only: bool,
        limit: int,
        offset: int,
    ) -> list[PageSummary]: ...

    @abstractmethod
    def search_pages(self, query: str, limit: int) -> list[PageSearchHit]: ...

    @abstractmethod
    def get_page_ancestry(self, page_id: str) -> list[PageAncestor]: ...

    @abstractmethod
    def set_parent(self, child_id: str, parent_id: str | None) -> ParentSetResponse: ...

    @abstractmethod
    def get_inline_link(self, page_id: str) -> InlineLinkResponse: ...
