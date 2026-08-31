from abc import ABC, abstractmethod

from models.pages import Page
from schemas.pages import PageSearchHit, PageStatus, PageSummary, PageTitleRef


class IPageRepository(ABC):
    @abstractmethod
    def get(self, page_id: str) -> Page | None: ...

    @abstractmethod
    def create(self, page: Page) -> Page: ...

    @abstractmethod
    def save(self, page: Page) -> Page: ...

    @abstractmethod
    def soft_delete(self, page_id: str) -> bool: ...

    @abstractmethod
    def restore(self, page_id: str) -> bool: ...

    @abstractmethod
    def purge(self, page_id: str) -> bool: ...

    @abstractmethod
    def mark_reviewed(self, page_id: str, reviewed_at: str) -> Page | None: ...

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
    def search(self, query: str, limit: int) -> list[PageSearchHit]: ...

    @abstractmethod
    def list_children(self, parent_id: str) -> list[Page]: ...

    @abstractmethod
    def list_visible_pages(self) -> list[PageSummary]: ...

    @abstractmethod
    def find_by_title(self, title: str) -> list[PageTitleRef]: ...
