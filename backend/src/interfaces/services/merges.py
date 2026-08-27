from abc import ABC, abstractmethod

from schemas.merges import MergeOutcome, MergePlan


class IMergeService(ABC):
    """Merges: additive import of a scoped export into the current knowledge file.

    Plan first. Same-id pages with the same content are skipped. Same-id pages
    with different content are blocked. New pages and links are inserted.
    Execute writes a pre_merge backup first.
    """

    @abstractmethod
    def plan(self, path: str) -> MergePlan: ...

    @abstractmethod
    def execute(self, path: str) -> MergeOutcome: ...
