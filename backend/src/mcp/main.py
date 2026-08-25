import importlib
from collections.abc import Callable
from typing import cast

from . import links as link_tools
from .pages import MCPServerApp, register


def _build_server() -> MCPServerApp:
    server_module = importlib.import_module("mcp.server.mcpserver")
    server_type = cast(Callable[[str], MCPServerApp], server_module.__dict__["MCPServer"])
    return server_type("locram")


mcp = _build_server()
register(mcp)
link_tools.register(mcp)


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
