import sqlite3
from pathlib import Path

import pytest

from exceptions.exports import ExportEmptyError, ExportNotFoundError, ExportScopeError
from schemas.exports import ExportScope
from schemas.smart_folders import FilterState
from services.exports import ExportService


def test_export_page_ids_copies_internal_links_and_clears_missing_parent(
    export_service: ExportService,
) -> None:
    pages = {
        page.title: page.id for page in export_service._page_repository.list_visible_pages()
    }
    both = export_service.export_subgraph(
        ExportScope(page_ids=[pages["Alpha"], pages["Beta"]], package_label="Slice")
    )
    child_only = export_service.export_subgraph(ExportScope(page_ids=[pages["Beta"]]))
    inspection = export_service.inspect_artifact(both.output_path)
    kept_parent = _parent_id(both.output_path, pages["Beta"])
    cleared_parent = _parent_id(child_only.output_path, pages["Beta"])

    assert both.page_count == 2
    assert both.link_count == 2
    assert both.attachment_coverage_label == "db_only"
    assert inspection.artifact_class == "scoped_export"
    assert inspection.package_label == "Slice"
    assert inspection.valid_actions == ["register_as_base", "merge_into_active"]
    assert kept_parent == pages["Alpha"]
    assert cleared_parent is None
    assert child_only.page_count == 1
    assert child_only.link_count == 0


def test_export_include_all_and_filter(
    export_service: ExportService,
) -> None:
    all_pages = export_service.export_subgraph(ExportScope(include_all=True))
    filtered = export_service.export_subgraph(
        ExportScope(filter=FilterState.model_validate({"searchQuery": "Alpha"}))
    )
    items = export_service.list_exports()

    assert all_pages.page_count == 3
    assert filtered.page_count == 1
    assert {item.filename for item in items} == {
        Path(all_pages.output_path).name,
        Path(filtered.output_path).name,
    }


def test_export_rename_delete_and_errors(export_service: ExportService) -> None:
    created = export_service.export_subgraph(ExportScope(include_all=True))
    filename = Path(created.output_path).name
    renamed = export_service.rename_export(filename, "moved-export.db")
    deleted = export_service.delete_export_by_artifact_id(created.artifact_id)

    assert renamed.filename == "moved-export.db"
    assert deleted.deleted is True
    assert export_service.list_exports() == []

    with pytest.raises(ExportScopeError):
        export_service.export_subgraph(ExportScope())

    with pytest.raises(ExportEmptyError):
        export_service.export_subgraph(ExportScope(page_ids=["missing-page"]))

    with pytest.raises(ExportNotFoundError):
        export_service.delete_export("missing.db")


def test_inspect_ordinary_knowledge_file(
    export_service: ExportService,
    tmp_path: Path,
) -> None:
    inspection = export_service.inspect_artifact(str(tmp_path / "notes.db"))

    assert inspection.artifact_class == "ordinary_base"
    assert inspection.page_count == 3
    assert "restore" in inspection.valid_actions


def _parent_id(path: str, page_id: str) -> str | None:
    connection = sqlite3.connect(path)
    row = connection.execute(
        "SELECT parent_id FROM pages WHERE id = ?",
        (page_id,),
    ).fetchone()
    connection.close()

    if row is None:
        return None

    parent_id = row[0]

    if parent_id is None:
        return None

    return str(parent_id)
