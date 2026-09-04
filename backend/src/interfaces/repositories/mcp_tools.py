from abc import ABC, abstractmethod

from schemas.mcp_tools import McpToolVisibilityRecord


class IMcpToolVisibilityRepository(ABC):
    @abstractmethod
    def load(self) -> McpToolVisibilityRecord: ...

    @abstractmethod
    def save(self, settings: McpToolVisibilityRecord) -> McpToolVisibilityRecord: ...
