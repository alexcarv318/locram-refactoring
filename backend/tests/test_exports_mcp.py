from pathlib import Path

import mcp.exports as mcp_exports
from services.exports import ExportService


def test_mcp_export_tools(mcp_export_service: ExportService) -> None:
    created = mcp_exports.export_subgraph(include_all=True, package_label="MCP")
    items = mcp_exports.artifact_list_exports()
    inspected = mcp_exports.artifact_inspect_artifact(created.output_path)
    deleted = mcp_exports.artifact_delete_export(created.artifact_id)

    assert created.page_count == 3
    assert [item.filename for item in items] == [Path(created.output_path).name]
    assert inspected.package_label == "MCP"
    assert deleted.deleted is True
    assert mcp_exports.artifact_list_exports() == []
