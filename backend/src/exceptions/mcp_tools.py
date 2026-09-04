from exceptions.app import AppError


class McpToolVisibilityError(AppError):
    status_code: int = 400


class McpToolHiddenError(AppError):
    status_code: int = 403
    code = "MCP_TOOL_HIDDEN"

    def __init__(self, tool_name: str) -> None:
        super().__init__(f"MCP tool {tool_name} is hidden by local tool visibility settings.")
