from abc import ABC, abstractmethod

from models.changes import ChangeEvent, ChangeVersion


class IChangeRepository(ABC):
    @abstractmethod
    def get_version(self) -> ChangeVersion: ...

    @abstractmethod
    def list_events(self, after_version: int, through_version: int) -> list[ChangeEvent]: ...
