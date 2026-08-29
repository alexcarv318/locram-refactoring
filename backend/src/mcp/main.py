import importlib
from collections.abc import Callable
from typing import cast

from . import access as access_tools
from . import attachments as attachment_tools
from . import backups as backup_tools
from . import bases as bases_tools
from . import embeddings as embedding_tools
from . import exports as export_tools
from . import links as link_tools
from . import merges as merge_tools
from . import pages as pages_tools
from . import sharing as sharing_tools
from . import smart_folders as smart_folder_tools
from .protocol import MCPServerApp


def _build_server() -> MCPServerApp:
    server_module = importlib.import_module("mcp.server.mcpserver")
    server_type = cast(Callable[[str], MCPServerApp], server_module.__dict__["MCPServer"])
    return server_type("locram")


mcp = _build_server()
pages_tools.register(mcp)
link_tools.register(mcp)
bases_tools.register(mcp)
attachment_tools.register(mcp)
smart_folder_tools.register(mcp)
embedding_tools.register(mcp)
backup_tools.register(mcp)
export_tools.register(mcp)
merge_tools.register(mcp)
sharing_tools.register(mcp)
access_tools.register(mcp)


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
