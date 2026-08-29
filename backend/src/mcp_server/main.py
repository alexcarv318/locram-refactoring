from mcp.server.mcpserver import MCPServer

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

mcp_server = MCPServer("locram")

pages_tools.register(mcp_server)
link_tools.register(mcp_server)
bases_tools.register(mcp_server)
attachment_tools.register(mcp_server)
smart_folder_tools.register(mcp_server)
embedding_tools.register(mcp_server)
backup_tools.register(mcp_server)
export_tools.register(mcp_server)
merge_tools.register(mcp_server)
sharing_tools.register(mcp_server)
access_tools.register(mcp_server)


def main() -> None:
    mcp_server.run()


if __name__ == "__main__":
    main()
