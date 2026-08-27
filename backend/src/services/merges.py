from pathlib import Path

from ulid import ULID

from interfaces.repositories.links import ILinkRepository
from interfaces.repositories.merges import IMergeRepository
from interfaces.repositories.pages import IPageRepository
from interfaces.services.backups import IBackupService
from interfaces.services.merges import IMergeService
from models.links import Link
from models.pages import Page
from schemas.links import LinkType
from schemas.merges import (
    MergeConflict,
    MergeDuplicateCandidate,
    MergeLink,
    MergeOutcome,
    MergePage,
    MergePlan,
)
from schemas.pages import PageStatus, PageType


class MergeService(IMergeService):
    def __init__(
        self,
        merge_repository: IMergeRepository,
        page_repository: IPageRepository,
        link_repository: ILinkRepository,
        backup_service: IBackupService,
    ) -> None:
        self._merge_repository = merge_repository
        self._page_repository = page_repository
        self._link_repository = link_repository
        self._backup_service = backup_service

    def plan(self, path: str) -> MergePlan:
        source = self._merge_repository.read_source(Path(path))
        target_base_id, target_display_name = self._merge_repository.get_target_base()
        blocked: list[MergeConflict] = []
        duplicates: list[MergeDuplicateCandidate] = []
        mergeable_ids: set[str] = set()
        new_page_count = 0
        already_present_count = 0

        for page in source.pages:
            existing = self._page_repository.get(page.id)

            if existing is None:
                new_page_count += 1
                mergeable_ids.add(page.id)
                duplicates.extend(self._duplicate_candidates(page))
                continue

            if self._same_content(existing, page):
                already_present_count += 1
                mergeable_ids.add(page.id)
                continue

            blocked.append(
                MergeConflict(
                    page_id=page.id,
                    title=page.title,
                    reason="same stable page id exists with differing content",
                )
            )

        new_link_count = 0

        for link in source.links:
            if link.source_id not in mergeable_ids or link.target_id not in mergeable_ids:
                continue

            if self._link_exists(link):
                already_present_count += 1
            else:
                new_link_count += 1

        if source.artifact_id is not None and source.source_base_id is not None:
            provenance = (
                f"artifact {source.artifact_id} preserves source base {source.source_base_id}"
            )
        elif source.source_base_id is not None:
            provenance = f"source base {source.source_base_id} available"
        else:
            provenance = "source provenance is partial"

        return MergePlan(
            source_path=source.path,
            source_artifact_id=source.artifact_id,
            source_base_id=source.source_base_id,
            target_base_id=target_base_id,
            target_display_name=target_display_name,
            incoming_page_count=len(source.pages),
            incoming_link_count=len(source.links),
            new_page_count=new_page_count,
            new_link_count=new_link_count,
            already_present_count=already_present_count,
            duplicate_candidate_count=len(duplicates),
            blocked_conflict_count=len(blocked),
            provenance_coverage_summary=provenance,
            duplicate_candidates=duplicates,
            blocked_conflicts=blocked,
        )

    def execute(self, path: str) -> MergeOutcome:
        plan = self.plan(path)
        source = self._merge_repository.read_source(Path(path))
        backup = self._backup_service.create_backup("pre_merge")
        blocked_ids = {conflict.page_id for conflict in plan.blocked_conflicts}
        inserted_page_count = 0
        inserted_link_count = 0
        already_present_count = 0

        for page in source.pages:
            if page.id in blocked_ids:
                continue

            existing = self._page_repository.get(page.id)

            if existing is None:
                self._page_repository.create(self._to_page(page, parent_id=None))
                inserted_page_count += 1
                continue

            already_present_count += 1

        for page in source.pages:
            if page.id in blocked_ids or page.parent_id is None:
                continue

            if self._page_repository.get(page.parent_id) is None:
                continue

            current = self._page_repository.get(page.id)

            if current is None or current.parent_id == page.parent_id:
                continue

            current.parent_id = page.parent_id
            self._page_repository.save(current)

        for link in source.links:
            if link.source_id in blocked_ids or link.target_id in blocked_ids:
                continue

            if self._page_repository.get(link.source_id) is None:
                continue

            if self._page_repository.get(link.target_id) is None:
                continue

            created = self._link_repository.create(
                Link(
                    source_id=link.source_id,
                    target_id=link.target_id,
                    link_type=LinkType(link.link_type),
                    created_at=link.created_at,
                )
            )

            if created:
                inserted_link_count += 1
            else:
                already_present_count += 1

        return MergeOutcome(
            merge_operation_id=str(ULID()),
            backup_filename=backup.filename,
            inserted_page_count=inserted_page_count,
            inserted_link_count=inserted_link_count,
            already_present_count=already_present_count,
            duplicate_candidate_warning_count=plan.duplicate_candidate_count,
            blocked_conflict_count=plan.blocked_conflict_count,
        )

    def _duplicate_candidates(self, page: MergePage) -> list[MergeDuplicateCandidate]:
        candidates: list[MergeDuplicateCandidate] = []

        for existing in self._page_repository.list_visible_pages():
            if existing.id == page.id or existing.title != page.title:
                continue

            candidates.append(
                MergeDuplicateCandidate(
                    source_page_id=page.id,
                    source_title=page.title,
                    target_page_id=existing.id,
                    target_title=existing.title,
                    reason="same title with different stable identity",
                )
            )

        return candidates

    def _same_content(self, existing: Page, incoming: MergePage) -> bool:
        if (
            existing.content_hash is not None
            and incoming.content_hash is not None
            and existing.content_hash == incoming.content_hash
        ):
            return True

        return existing.content == incoming.content

    def _link_exists(self, link: MergeLink) -> bool:
        for existing in self._link_repository.list_for_page(link.source_id):
            if (
                existing.source_id == link.source_id
                and existing.target_id == link.target_id
                and existing.link_type.value == link.link_type
            ):
                return True

        return False

    @staticmethod
    def _to_page(page: MergePage, parent_id: str | None) -> Page:
        return Page(
            id=page.id,
            title=page.title,
            content=page.content,
            type=PageType(page.type),
            status=PageStatus(page.status),
            subject=page.subject,
            tags=page.tags,
            parent_id=parent_id,
            content_hash=page.content_hash,
            review_interval_days=page.review_interval_days,
            created_at=page.created_at,
            updated_at=page.updated_at,
            reviewed_at=page.reviewed_at,
        )
