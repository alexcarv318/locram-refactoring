from abc import ABC, abstractmethod

from models.sharing import BaseShareGrant
from schemas.sharing import RemotePageDetail, RemotePageListItem, RemoteSearchHit


class ISharingRepository(ABC):
    @abstractmethod
    def get(self, grant_id: str) -> BaseShareGrant | None: ...

    @abstractmethod
    def list_owner(self, owner_actor_ref: str) -> list[BaseShareGrant]: ...

    @abstractmethod
    def save(self, grant: BaseShareGrant) -> BaseShareGrant: ...

    @abstractmethod
    def delete(self, grant_id: str) -> None: ...


class IShareSession(ABC):
    @abstractmethod
    def get_page(self, page_id: str) -> RemotePageDetail | None: ...

    @abstractmethod
    def list_pages(
        self,
        parent_id: str,
        limit: int,
        offset: int,
    ) -> list[RemotePageListItem]: ...

    @abstractmethod
    def search_pages(self, query: str, limit: int) -> list[RemoteSearchHit]: ...

    @abstractmethod
    def update_page(self, page_id: str, title: str, content: str) -> RemotePageDetail: ...
