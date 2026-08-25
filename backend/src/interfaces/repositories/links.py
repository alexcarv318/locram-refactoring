from abc import ABC, abstractmethod

from models.links import Link
from schemas.links import LinkType


class ILinkRepository(ABC):
    @abstractmethod
    def create(self, link: Link) -> bool: ...

    @abstractmethod
    def delete(
        self,
        source_id: str,
        target_id: str,
        link_type: LinkType | None,
    ) -> None: ...

    @abstractmethod
    def list_for_page(self, page_id: str) -> list[Link]: ...
