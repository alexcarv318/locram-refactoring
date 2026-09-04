import pytest
from mcp.server.mcpserver.exceptions import ToolError

from exceptions.pages import PageNotFoundError
from mcp_server.protocol import wrap_app_error


def test_wrap_app_error_surfaces_message() -> None:
    def boom() -> None:
        raise PageNotFoundError("page-one")

    wrapped = wrap_app_error(boom)

    with pytest.raises(ToolError, match="Page page-one not found"):
        wrapped()
