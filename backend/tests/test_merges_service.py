from schemas.exports import ExportScope
from schemas.pages import PageCreate, PageStatus, PageUpdate
from services.exports import ExportService
from services.merges import MergeService
from services.pages import PageService


def test_plan_and_execute_inserts_new_pages(
    merge_bundle: tuple[MergeService, ExportService, PageService],
) -> None:
    merge_service, export_service, page_service = merge_bundle
    pages = {
        page.title: page.id
        for page in page_service.list_pages(
            status=PageStatus.ACTIVE,
            parent_id=None,
            roots_only=False,
            limit=20,
            offset=0,
        )
    }
    exported = export_service.export_subgraph(
        ExportScope(page_ids=[pages["Alpha"], pages["Beta"]])
    )
    page_service.delete_page(pages["Beta"])
    page_service.purge_page(pages["Beta"])
    plan = merge_service.plan(exported.output_path)
    outcome = merge_service.execute(exported.output_path)
    restored = page_service.get_page(pages["Beta"])

    assert plan.new_page_count == 1
    assert plan.already_present_count >= 1
    assert plan.blocked_conflict_count == 0
    assert outcome.inserted_page_count == 1
    assert "-pre_merge-" in outcome.backup_filename
    assert restored.title == "Beta"
    assert restored.parent_id == pages["Alpha"]


def test_same_id_different_content_is_blocked(
    merge_bundle: tuple[MergeService, ExportService, PageService],
) -> None:
    merge_service, export_service, page_service = merge_bundle
    pages = {
        page.title: page.id
        for page in page_service.list_pages(
            status=PageStatus.ACTIVE,
            parent_id=None,
            roots_only=False,
            limit=20,
            offset=0,
        )
    }
    exported = export_service.export_subgraph(ExportScope(page_ids=[pages["Alpha"]]))
    page_service.update_page(pages["Alpha"], PageUpdate(content="changed"))
    plan = merge_service.plan(exported.output_path)
    outcome = merge_service.execute(exported.output_path)

    assert plan.blocked_conflict_count == 1
    assert plan.blocked_conflicts[0].page_id == pages["Alpha"]
    assert outcome.inserted_page_count == 0
    assert "changed" in page_service.get_page(pages["Alpha"]).content


def test_duplicate_title_is_a_warning_and_still_inserts(
    merge_bundle: tuple[MergeService, ExportService, PageService],
) -> None:
    merge_service, export_service, page_service = merge_bundle
    other = page_service.create_page(PageCreate(title="Incoming", content="new"))
    exported = export_service.export_subgraph(ExportScope(page_ids=[other.id]))
    page_service.delete_page(other.id)
    page_service.purge_page(other.id)
    page_service.create_page(PageCreate(title="Incoming", content="local"))
    plan = merge_service.plan(exported.output_path)
    outcome = merge_service.execute(exported.output_path)

    assert plan.duplicate_candidate_count == 1
    assert outcome.inserted_page_count == 1
    assert page_service.get_page(other.id).title == "Incoming"
