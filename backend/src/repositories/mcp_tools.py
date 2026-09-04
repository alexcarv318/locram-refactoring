from pathlib import Path

from pydantic import ValidationError

from interfaces.repositories.mcp_tools import IMcpToolVisibilityRepository
from schemas.mcp_tools import McpToolVisibilityRecord


class McpToolVisibilityRepository(IMcpToolVisibilityRepository):
    def __init__(self, path: Path) -> None:
        self._path = path

    def load(self) -> McpToolVisibilityRecord:
        if not self._path.is_file():
            return McpToolVisibilityRecord()

        try:
            return McpToolVisibilityRecord.model_validate_json(self._path.read_text())
        except (OSError, ValidationError):
            return McpToolVisibilityRecord()

    def save(self, settings: McpToolVisibilityRecord) -> McpToolVisibilityRecord:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(settings.model_dump_json(indent=2))

        return settings
