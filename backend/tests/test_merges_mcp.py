import mcp_server.merges as mcp_merges
from schemas.exports import ExportScope
from services.exports import ExportService
from services.merges import MergeService
from services.pages import PageService


def test_mcp_merge_tools(
    merge_bundle: tuple[MergeService, ExportService, PageService],
    mcp_merge_service: MergeService,
) -> None:
    _merge_service, export_service, _page_service = merge_bundle
    exported = export_service.export_subgraph(ExportScope(include_all=True))
    plan = mcp_merges.merge_plan(exported.output_path)
    outcome = mcp_merges.merge_execute(exported.output_path)

    assert plan.incoming_page_count == 3
    assert plan.new_page_count == 0
    assert outcome.inserted_page_count == 0
    assert outcome.backup_filename.startswith("locram-pre_merge-")
