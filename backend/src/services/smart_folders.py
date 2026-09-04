from datetime import UTC, datetime, timedelta

from exceptions.smart_folders import (
    SmartFolderNameError,
    SmartFolderNotFoundError,
    SmartFolderPreviewError,
    SmartFolderUpdateError,
)
from interfaces.repositories.links import ILinkRepository
from interfaces.repositories.pages import IPageRepository
from interfaces.repositories.smart_folders import ISmartFolderRepository
from interfaces.services.access import IAccessService
from interfaces.services.links import ILinkService
from interfaces.services.smart_folders import ISmartFolderService
from schemas.access import DesktopCapability
from schemas.pages import PageStatus, PageSummary
from schemas.smart_folders import (
    BUILT_IN_SCOPE_IDS,
    CREATED_MONTH_SCOPE_ID,
    CREATED_TODAY_SCOPE_ID,
    CREATED_WEEK_SCOPE_ID,
    MODIFIED_MONTH_SCOPE_ID,
    MODIFIED_TODAY_SCOPE_ID,
    MODIFIED_WEEK_SCOPE_ID,
    NEED_REVIEW_SCOPE_ID,
    ORPHANED_SCOPE_ID,
    DateRange,
    FilterPresetDeletedResponse,
    FilterPresetRecord,
    FilterState,
    MetadataRule,
    MetadataRuleField,
    MetadataRuleGroup,
    MetadataRuleOperator,
    NotesSummariesResponse,
    PageIdMode,
    RuleJoiner,
    SmartFolderGraph,
    SmartFolderGraphNode,
)


class SmartFolderService(ISmartFolderService):
    def __init__(
        self,
        smart_folder_repository: ISmartFolderRepository,
        page_repository: IPageRepository,
        link_repository: ILinkRepository,
        link_service: ILinkService,
        access_service: IAccessService | None = None,
    ) -> None:
        self._smart_folder_repository = smart_folder_repository
        self._page_repository = page_repository
        self._link_repository = link_repository
        self._link_service = link_service
        self._access_service = access_service

    def list_presets(self) -> list[FilterPresetRecord]:
        return self._smart_folder_repository.list_presets()

    def get_preset(self, preset_id: str) -> FilterPresetRecord:
        preset = self._smart_folder_repository.get_preset(preset_id)

        if preset is None:
            raise SmartFolderNotFoundError(preset_id)

        return preset

    def create_preset(self, name: str, filter_state: FilterState) -> FilterPresetRecord:
        self._deny_without_multi_base()
        trimmed = name.strip()

        if trimmed == "":
            raise SmartFolderNameError()

        return self._smart_folder_repository.create_preset(trimmed, filter_state)

    def update_preset(
        self,
        preset_id: str,
        name: str | None,
        filter_state: FilterState | None,
    ) -> FilterPresetRecord:
        self._deny_without_multi_base()
        trimmed = name.strip() if name is not None else None

        if trimmed == "":
            raise SmartFolderNameError()

        if trimmed is None and filter_state is None:
            raise SmartFolderUpdateError()

        updated = self._smart_folder_repository.update_preset(preset_id, trimmed, filter_state)

        if updated is None:
            raise SmartFolderNotFoundError(preset_id)

        return updated

    def delete_preset(self, preset_id: str) -> FilterPresetDeletedResponse:
        self._deny_without_multi_base()
        deleted = self._smart_folder_repository.delete_preset(preset_id)

        if not deleted:
            raise SmartFolderNotFoundError(preset_id)

        return FilterPresetDeletedResponse(deleted=True, id=preset_id)

    def get_notes_summaries(self) -> NotesSummariesResponse:
        summaries = self._page_repository.list_visible_pages()
        linked_ids = set(self._link_repository.list_linked_page_ids())
        now = datetime.now(UTC)

        return NotesSummariesResponse(
            items=summaries,
            built_in_counts={
                scope_id: len(self._match_scope(scope_id, summaries, linked_ids, now))
                for scope_id in BUILT_IN_SCOPE_IDS
            },
            preset_counts={
                preset.id: len(self._match_filter(summaries, preset.filter))
                for preset in self._smart_folder_repository.list_presets()
                if preset.id not in BUILT_IN_SCOPE_IDS
            },
            quick_access_scope_ids=list(BUILT_IN_SCOPE_IDS),
        )

    def get_notes_graph(self, expand_hops: int) -> SmartFolderGraph:
        seed_ids = [page.id for page in self._page_repository.list_visible_pages()]

        return self._graph(seed_ids, "base", None, expand_hops)

    def get_smart_folder_graph(
        self,
        preset_id: str | None,
        filter_state: FilterState | None,
        expand_hops: int,
    ) -> SmartFolderGraph:
        return self._graph(
            self.matching_page_ids(preset_id, filter_state),
            "smart_folder",
            preset_id,
            expand_hops,
        )

    def matching_page_ids(
        self,
        preset_id: str | None,
        filter_state: FilterState | None,
    ) -> list[str]:
        has_preset = preset_id is not None
        has_filter = filter_state is not None

        if has_preset == has_filter:
            raise SmartFolderPreviewError()

        summaries = self._page_repository.list_visible_pages()
        linked_ids = set(self._link_repository.list_linked_page_ids())
        now = datetime.now(UTC)

        if preset_id is not None and preset_id in BUILT_IN_SCOPE_IDS:
            return self._match_scope(preset_id, summaries, linked_ids, now)

        if preset_id is not None:
            return self._match_filter(summaries, self.get_preset(preset_id).filter)

        if filter_state is None:
            raise SmartFolderPreviewError()

        return self._match_filter(summaries, filter_state)

    def _graph(
        self,
        seed_ids: list[str],
        scope_kind: str,
        preset_id: str | None,
        expand_hops: int,
    ) -> SmartFolderGraph:
        if not seed_ids:
            return SmartFolderGraph(
                scope_id="base",
                scope_kind=scope_kind,
                preset_id=preset_id,
                nodes=[],
                links=[],
            )

        nodes, links = self._link_service.collect_neighborhood(seed_ids, expand_hops)
        seeds = set(seed_ids)

        return SmartFolderGraph(
            scope_id="base",
            scope_kind=scope_kind,
            preset_id=preset_id,
            nodes=[
                SmartFolderGraphNode(
                    **node.model_dump(),
                    scope_origin="seed" if node.id in seeds else "context",
                )
                for node in nodes
            ],
            links=links,
        )

    def _match_scope(
        self,
        scope_id: str,
        summaries: list[PageSummary],
        linked_ids: set[str],
        now: datetime,
    ) -> list[str]:
        filter_state = self._built_in_filter(scope_id, now)

        return [
            summary.id
            for summary in summaries
            if self.matches_filter(summary, filter_state)
            and self._matches_extra_scope(summary, scope_id, linked_ids, now)
        ]

    def _match_filter(self, summaries: list[PageSummary], filter_state: FilterState) -> list[str]:
        return [summary.id for summary in summaries if self.matches_filter(summary, filter_state)]

    def _built_in_filter(self, scope_id: str, now: datetime) -> FilterState:
        if scope_id == CREATED_TODAY_SCOPE_ID:
            return self._recent_filter("createdAt", now, 0)

        if scope_id == CREATED_WEEK_SCOPE_ID:
            return self._recent_filter("createdAt", now, 6)

        if scope_id == CREATED_MONTH_SCOPE_ID:
            return self._recent_filter("createdAt", now, 29)

        if scope_id == MODIFIED_TODAY_SCOPE_ID:
            return self._recent_filter("updatedAt", now, 0)

        if scope_id == MODIFIED_WEEK_SCOPE_ID:
            return self._recent_filter("updatedAt", now, 6)

        if scope_id == MODIFIED_MONTH_SCOPE_ID:
            return self._recent_filter("updatedAt", now, 29)

        return FilterState()

    @staticmethod
    def _recent_filter(field_name: str, now: datetime, days_back: int) -> FilterState:
        today = now.astimezone(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        start = (today - timedelta(days=days_back)).date().isoformat()
        end = today.date().isoformat()

        return FilterState.model_validate(
            {
                "selectionEncoding": "explicit",
                field_name: {"from": start, "to": end},
            }
        )

    def _matches_extra_scope(
        self,
        summary: PageSummary,
        scope_id: str,
        linked_ids: set[str],
        now: datetime,
    ) -> bool:
        if scope_id == NEED_REVIEW_SCOPE_ID:
            return self._is_due_for_review(summary, now)

        if scope_id == ORPHANED_SCOPE_ID:
            return (
                summary.status is PageStatus.ACTIVE
                and summary.parent_id is None
                and summary.id not in linked_ids
            )

        return True

    @staticmethod
    def _is_due_for_review(summary: PageSummary, now: datetime) -> bool:
        if summary.status is not PageStatus.ACTIVE:
            return False

        base_timestamp = summary.reviewed_at or summary.updated_at

        if base_timestamp == "":
            return False

        try:
            base_date = datetime.fromisoformat(base_timestamp.replace("Z", "+00:00"))
        except ValueError:
            return False

        base_date = (
            base_date.replace(tzinfo=UTC)
            if base_date.tzinfo is None
            else base_date.astimezone(UTC)
        )

        return base_date + timedelta(days=summary.review_interval_days) <= now

    def matches_filter(self, summary: PageSummary, filter_state: FilterState) -> bool:
        if not self._matches_page_ids(summary.id, filter_state):
            return False

        if filter_state.types and summary.type.value not in filter_state.types:
            return False

        if filter_state.statuses and summary.status.value not in filter_state.statuses:
            return False

        if filter_state.subjects and not any(
            value in filter_state.subjects for value in summary.subject
        ):
            return False

        if filter_state.tags and not any(value in filter_state.tags for value in summary.tags):
            return False

        search_query = filter_state.search_query.strip().lower()

        if search_query:
            haystacks = [
                summary.title.lower(),
                *(value.lower() for value in summary.subject),
                *(value.lower() for value in summary.tags),
            ]

            if not any(search_query in haystack for haystack in haystacks):
                return False

        if not self._matches_date_range(summary.created_at, filter_state.created_at):
            return False

        if not self._matches_date_range(summary.updated_at, filter_state.updated_at):
            return False

        if not self._matches_date_range(summary.reviewed_at, filter_state.reviewed_at):
            return False

        return all(
            self._matches_metadata_group(summary, group)
            for group in filter_state.metadata_rule_groups
        )

    @staticmethod
    def _matches_page_ids(page_id: str, filter_state: FilterState) -> bool:
        if not filter_state.page_ids:
            return True

        page_in_filter = page_id in filter_state.page_ids

        if filter_state.page_id_mode is PageIdMode.NOT:
            return not page_in_filter

        return page_in_filter

    @staticmethod
    def _matches_date_range(value: str | None, date_range: DateRange | None) -> bool:
        if date_range is None:
            return True

        if date_range.range_from == "" and date_range.range_to == "":
            return True

        if value is None or value == "":
            return False

        date_portion = value[:10] if len(value) >= 10 else value

        if date_range.range_from != "" and date_portion < date_range.range_from:
            return False

        return date_range.range_to == "" or date_portion <= date_range.range_to

    def _matches_metadata_group(self, summary: PageSummary, group: MetadataRuleGroup) -> bool:
        rules = [rule for rule in group.rules if any(value.strip() for value in rule.values)]

        if not rules:
            return True

        if group.joiner is RuleJoiner.OR:
            group_matches = any(self._matches_rule(summary, rule) for rule in rules)
        else:
            group_matches = all(self._matches_rule(summary, rule) for rule in rules)

        if group.negated:
            return not group_matches

        return group_matches

    def _matches_rule(self, summary: PageSummary, rule: MetadataRule) -> bool:
        if rule.field is MetadataRuleField.TITLE:
            return self._matches_title_rule(summary.title, rule)

        if rule.field is MetadataRuleField.SUBJECT:
            return self._matches_token_rule(rule.values, rule.operator, summary.subject)

        if rule.field is MetadataRuleField.TAG:
            return self._matches_token_rule(rule.values, rule.operator, summary.tags)

        return True

    @staticmethod
    def _matches_title_rule(title: str, rule: MetadataRule) -> bool:
        lowered_title = title.lower()
        values = [value.strip().lower() for value in rule.values if value.strip()]

        if not values:
            return True

        if rule.operator is MetadataRuleOperator.DOES_NOT_CONTAIN:
            return all(value not in lowered_title for value in values)

        return all(value in lowered_title for value in values)

    @staticmethod
    def _matches_token_rule(
        values: list[str],
        operator: MetadataRuleOperator,
        candidates: list[str],
    ) -> bool:
        lowered_values = [value.strip().lower() for value in values if value.strip()]
        lowered_candidates = [candidate.lower() for candidate in candidates]

        if not lowered_values:
            return True

        if operator is MetadataRuleOperator.HAS_ALL_OF:
            return all(value in lowered_candidates for value in lowered_values)

        if operator in {MetadataRuleOperator.HAS_NONE_OF, MetadataRuleOperator.DOES_NOT_CONTAIN}:
            return all(value not in lowered_candidates for value in lowered_values)

        return any(value in lowered_candidates for value in lowered_values)

    def _deny_without_multi_base(self) -> None:
        if self._access_service is None:
            return

        self._access_service.deny_without_capability(DesktopCapability.MULTI_BASE)
