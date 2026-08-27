from abc import ABC, abstractmethod
from pathlib import Path

from schemas.merges import MergeSource


class IMergeRepository(ABC):
    @abstractmethod
    def read_source(self, path: Path) -> MergeSource: ...

    @abstractmethod
    def get_target_base(self) -> tuple[str, str]: ...
