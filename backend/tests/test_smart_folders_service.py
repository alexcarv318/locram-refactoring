import pytest

from exceptions.smart_folders import (
    SmartFolderNameError,
    SmartFolderNotFoundError,
    SmartFolderPreviewError,
)
from schemas.links import LinkType
from schemas.pages import PageCreate, PageStatus, PageSummary, PageType
from schemas.smart_folders import (
    CREATED_TODAY_SCOPE_ID,
    NEED_REVIEW_SCOPE_ID,
    ORPHANED_SCOPE_ID,
    FilterState,
    MetadataRule,
    MetadataRuleField,
    MetadataRuleGroup,
    MetadataRuleOperator,
    PageIdMode,
    RuleJoiner,
    SelectionEncoding,
)
from services.links import LinkService
from services.pages import PageService
from services.smart_folders import SmartFolderService


def make_summary(**overrides: object) -> PageSummary:
    values: dict[str, object] = {
        "id": "01TESTPAGE0000000000000001",
        "title": "Alpha systems",
        "type": PageType.PERMANENT,
        "status": PageStatus.ACTIVE,
        "subject": ["runtime"],
        "tags": ["bridge"],
        "parent_id": None,
        "created_at": "2026-08-26T10:00:00Z",
        "updated_at": "2026-08-26T10:00:00Z",
        "reviewed_at": None,
        "review_interval_days": 7,
        "child_count": 0,
        "active_descendant_count": 0,
    }
    values.update(overrides)

    return PageSummary.model_validate(values)


def test_filter_matcher_edge_cases(smart_folder_service: SmartFolderService) -> None:
    page = make_summary()

    empty_explicit = FilterState.model_validate(
        {"selectionEncoding": "explicit", "types": [], "statuses": ["active"]}
    )
    page_ids = FilterState.model_validate({"pageIds": [page.id], "pageIdMode": PageIdMode.NOT})
    subjects = FilterState(subjects=["runtime"])
    search = FilterState.model_validate({"searchQuery": "alpha"})
    created = FilterState.model_validate({"createdAt": {"from": "2026-08-26", "to": "2026-08-26"}})
    group = FilterState.model_validate(
        {
            "metadataRuleGroups": [
                MetadataRuleGroup(
                    joiner=RuleJoiner.OR,
                    negated=True,
                    rules=[
                        MetadataRule(
                            field=MetadataRuleField.TITLE,
                            operator=MetadataRuleOperator.CONTAINS,
                            values=["alpha"],
                        ),
                        MetadataRule(
                            field=MetadataRuleField.TAG,
                            operator=MetadataRuleOperator.HAS_ANY_OF,
                            values=["missing"],
                        ),
                    ],
                ).model_dump()
            ]
        }
    )

    assert smart_folder_service.matches_filter(page, empty_explicit) is False
    assert smart_folder_service.matches_filter(page, page_ids) is False
    assert smart_folder_service.matches_filter(page, subjects) is True
    assert smart_folder_service.matches_filter(page, search) is True
    assert smart_folder_service.matches_filter(page, created) is True
    assert smart_folder_service.matches_filter(page, group) is False
    assert (
        smart_folder_service.matches_filter(
            page,
            FilterState.model_validate({"selectionEncoding": SelectionEncoding.EXPLICIT}),
        )
        is True
    )


def test_preset_crud_and_preview_xor(smart_folder_service: SmartFolderService) -> None:
    created = smart_folder_service.create_preset("Review", FilterState(statuses=["active"]))
    fetched = smart_folder_service.get_preset(created.id)
    renamed = smart_folder_service.update_preset(created.id, "Due", None)

    assert fetched.name == "Review"
    assert renamed.name == "Due"
    assert len(smart_folder_service.list_presets()) == 1

    with pytest.raises(SmartFolderNameError):
        smart_folder_service.create_preset("  ", FilterState())

    with pytest.raises(SmartFolderNotFoundError):
        smart_folder_service.get_preset("01MISSINGPRESET000000000000")

    with pytest.raises(SmartFolderPreviewError):
        smart_folder_service.get_smart_folder_graph(None, None, 2)

    with pytest.raises(SmartFolderPreviewError):
        smart_folder_service.get_smart_folder_graph(created.id, FilterState(), 2)

    smart_folder_service.delete_preset(created.id)

    assert smart_folder_service.list_presets() == []


def test_built_in_scopes_and_graph(
    smart_folder_service: SmartFolderService,
    page_service: PageService,
    link_service: LinkService,
) -> None:
    orphan = page_service.create_page(PageCreate(title="Orphan"))
    linked = page_service.create_page(PageCreate(title="Linked"))
    neighbor = page_service.create_page(PageCreate(title="Neighbor"))
    due = page_service.create_page(PageCreate(title="Due", review_interval_days=0))
    link_service.link_pages(linked.id, neighbor.id, LinkType.RELATED)

    summaries = smart_folder_service.get_notes_summaries()
    orphaned = smart_folder_service.get_smart_folder_graph(ORPHANED_SCOPE_ID, None, 1)
    created_today = smart_folder_service.get_smart_folder_graph(CREATED_TODAY_SCOPE_ID, None, 1)
    review = smart_folder_service.get_smart_folder_graph(NEED_REVIEW_SCOPE_ID, None, 1)
    notes_graph = smart_folder_service.get_notes_graph(1)

    assert summaries.built_in_counts[ORPHANED_SCOPE_ID] >= 1
    assert summaries.quick_access_scope_ids[0] == CREATED_TODAY_SCOPE_ID
    assert orphan.id in {node.id for node in orphaned.nodes if node.scope_origin == "seed"}
    assert created_today.scope_kind == "smart_folder"
    assert due.id in {node.id for node in review.nodes}
    assert {node.id for node in notes_graph.nodes} >= {orphan.id, linked.id, neighbor.id}
