from abc import ABC, abstractmethod
from pathlib import Path

from schemas.mcp_tools import McpToolVisibilitySettings


class IMcpToolService(ABC):
    """MCP tool visibility for the desktop launcher and local STDIO/HTTP tools.

    Persists family toggles, builds the desktop catalogue, and writes the
    locram-mcp launcher script under LOCRAM_HOME/bin.
    """

    @abstractmethod
    def visibility(self) -> McpToolVisibilitySettings: ...

    @abstractmethod
    def update_visibility(self, enabled_groups: dict[str, bool]) -> McpToolVisibilitySettings: ...

    @abstractmethod
    def is_visible(self, tool_name: str) -> bool: ...

    @abstractmethod
    def deny_hidden(self, tool_name: str) -> None: ...

    @abstractmethod
    def ensure_launcher(self) -> Path: ...
