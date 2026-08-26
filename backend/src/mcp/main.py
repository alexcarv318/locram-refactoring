import importlib
from collections.abc import Callable
from typing import cast

from . import bases as bases_tools
from . import links as link_tools
from . import pages as pages_tools
from .protocol import MCPServerApp


def _build_server() -> MCPServerApp:
    server_module = importlib.import_module("mcp.server.mcpserver")
    server_type = cast(Callable[[str], MCPServerApp], server_module.__dict__["MCPServer"])
    return server_type("locram")


mcp = _build_server()
pages_tools.register(mcp)
link_tools.register(mcp)
bases_tools.register(mcp)


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
