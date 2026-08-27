from abc import ABC, abstractmethod

from models.sharing import BaseShareGrant


class ISharingRepository(ABC):
    @abstractmethod
    def get(self, grant_id: str) -> BaseShareGrant | None: ...

    @abstractmethod
    def list_owner(self, owner_actor_ref: str) -> list[BaseShareGrant]: ...

    @abstractmethod
    def save(self, grant: BaseShareGrant) -> BaseShareGrant: ...

    @abstractmethod
    def delete(self, grant_id: str) -> None: ...
