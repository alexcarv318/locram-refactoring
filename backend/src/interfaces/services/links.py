from abc import ABC, abstractmethod

from schemas.links import (
    BatchLinkResult,
    LinkCreate,
    LinkedPagesResponse,
    LinkType,
    PageGraph,
    UnlinkedPagesResponse,
)


class ILinkService(ABC):
    @abstractmethod
    def link_pages(
        self,
        source_id: str,
        target_id: str,
        link_type: LinkType,
    ) -> LinkedPagesResponse: ...

    @abstractmethod
    def unlink_pages(
        self,
        source_id: str,
        target_id: str,
        link_type: LinkType | None,
    ) -> UnlinkedPagesResponse: ...

    @abstractmethod
    def batch_link(self, links: list[LinkCreate]) -> BatchLinkResult: ...

    @abstractmethod
    def get_page_graph(self, page_id: str, expand_hops: int) -> PageGraph: ...
