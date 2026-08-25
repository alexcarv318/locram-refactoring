from datetime import UTC, datetime, timedelta

from ulid import ULID

from exceptions.pages import (
    HubParentError,
    PageNotDeletedError,
    PageNotFoundError,
    PagePromotionError,
)
from interfaces.repositories.pages import IPageRepository
from interfaces.services.pages import IPageService
from models.pages import Page
from schemas.pages import (
    MATURITY_PROMOTIONS,
    PageAncestor,
    PageCreate,
    PageDeletedResponse,
    PageDetail,
    PagePromotedResponse,
    PagePurgedResponse,
    PageRecord,
    PageRestoredResponse,
    PageReviewedResponse,
    PageSearchHit,
    PageStatus,
    PageSummary,
    PageTitleRef,
    PageType,
    PageUpdate,
)


class PageService(IPageService):
    def __init__(self, page_repository: IPageRepository) -> None:
        self._page_repository = page_repository

    def create_page(self, payload: PageCreate) -> PageDetail:
        self._validate_hub(payload.type, payload.parent_id)

        page = Page(
            id=str(ULID()),
            title=payload.title,
            content=self._titled_content(payload.title, payload.content),
            type=payload.type,
            status=payload.status,
            subject=payload.subject,
            tags=payload.tags,
            parent_id=payload.parent_id,
            review_interval_days=payload.review_interval_days,
        )
        created = self._page_repository.create(page)

        return self._to_detail(created)

    def get_page(self, page_id: str) -> PageDetail:
        page = self._page_repository.get(page_id)

        if page is None:
            raise PageNotFoundError(page_id)

        return self._to_detail(page)

    def update_page(self, page_id: str, payload: PageUpdate) -> PageDetail:
        page = self._page_repository.get(page_id)

        if page is None:
            raise PageNotFoundError(page_id)

        record = payload.apply(PageRecord.model_validate(page))
        self._validate_hub(record.type, record.parent_id)

        page.title = record.title
        page.content = self._titled_content(record.title, record.content)
        page.type = record.type
        page.status = record.status
        page.subject = record.subject
        page.tags = record.tags
        page.parent_id = record.parent_id
        page.review_interval_days = record.review_interval_days
        updated = self._page_repository.save(page)

        return self._to_detail(updated)

    def delete_page(self, page_id: str) -> PageDeletedResponse:
        page = self._page_repository.get(page_id)

        if page is None:
            raise PageNotFoundError(page_id)

        self._page_repository.soft_delete(page_id)

        return PageDeletedResponse(deleted=True, id=page_id)

    def restore_page(self, page_id: str) -> PageRestoredResponse:
        page = self._page_repository.get(page_id)

        if page is None:
            raise PageNotFoundError(page_id)

        if page.status is not PageStatus.TO_DELETE:
            raise PageNotDeletedError(page_id)

        self._page_repository.restore(page_id)
        restored = self._page_repository.get(page_id)

        if restored is None:
            raise PageNotFoundError(page_id)

        return PageRestoredResponse(restored=True, id=page_id, status=restored.status)

    def purge_page(self, page_id: str) -> PagePurgedResponse:
        page = self._page_repository.get(page_id)

        if page is None:
            raise PageNotFoundError(page_id)

        if page.status is not PageStatus.TO_DELETE:
            raise PageNotDeletedError(page_id)

        self._page_repository.purge(page_id)

        return PagePurgedResponse(purged=True, id=page_id)

    def mark_reviewed(self, page_id: str) -> PageReviewedResponse:
        reviewed_at = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        reviewed = self._page_repository.mark_reviewed(page_id, reviewed_at)

        if reviewed is None or reviewed.reviewed_at is None:
            raise PageNotFoundError(page_id)

        return PageReviewedResponse(id=page_id, reviewed_at=reviewed.reviewed_at)

    def promote_page(self, page_id: str) -> PagePromotedResponse:
        page = self._page_repository.get(page_id)

        if page is None:
            raise PageNotFoundError(page_id)

        previous_type = page.type
        next_type = MATURITY_PROMOTIONS.get(previous_type)

        if next_type is None:
            raise PagePromotionError(
                f"Cannot promote type '{previous_type.value}'. "
                "Only fleeting and note-taking pages can be promoted."
            )

        page.type = next_type
        updated = self._page_repository.save(page)

        return PagePromotedResponse(
            id=page_id,
            previous_type=previous_type,
            new_type=updated.type,
        )

    def list_pages(
        self,
        status: PageStatus,
        parent_id: str | None,
        roots_only: bool,
        limit: int,
        offset: int,
    ) -> list[PageSummary]:
        return self._page_repository.list_pages(
            status=status,
            parent_id=parent_id,
            roots_only=roots_only,
            limit=limit,
            offset=offset,
        )

    def search_pages(self, query: str, limit: int) -> list[PageSearchHit]:
        if query.strip() == "":
            return []

        return self._page_repository.search(query, limit)

    def get_page_ancestry(self, page_id: str) -> list[PageAncestor]:
        page = self._page_repository.get(page_id)

        if page is None:
            raise PageNotFoundError(page_id)

        ancestors: list[PageAncestor] = []
        visited = {page.id}
        current_parent_id = page.parent_id

        while current_parent_id is not None and current_parent_id not in visited:
            visited.add(current_parent_id)
            parent = self._page_repository.get(current_parent_id)

            if parent is None:
                break

            ancestors.append(
                PageAncestor(
                    id=parent.id,
                    title=parent.title,
                    parent_id=parent.parent_id,
                )
            )
            current_parent_id = parent.parent_id

        ancestors.reverse()
        return ancestors

    @staticmethod
    def _validate_hub(page_type: PageType, parent_id: str | None) -> None:
        if page_type is PageType.HUB and parent_id is not None:
            raise HubParentError

    @staticmethod
    def _titled_content(title: str, content: str) -> str:
        lines = content.lstrip("\n").splitlines()

        if lines and lines[0].startswith("#"):
            lines = lines[1:]

            while lines and lines[0] == "":
                lines = lines[1:]

        body = "\n".join(lines)

        if body == "":
            return f"# {title}\n\n"

        return f"# {title}\n\n{body}"

    def _to_detail(self, page: Page) -> PageDetail:
        parent: PageTitleRef | None = None

        if page.parent_id is not None:
            parent_page = self._page_repository.get(page.parent_id)

            if parent_page is not None:
                parent = PageTitleRef(id=parent_page.id, title=parent_page.title)

        children = self._page_repository.list_children(page.id)
        next_review: str | None = None

        if page.reviewed_at is not None:
            reviewed = datetime.fromisoformat(page.reviewed_at.replace("Z", "+00:00"))
            due = reviewed + timedelta(days=page.review_interval_days)
            next_review = due.strftime("%Y-%m-%dT%H:%M:%SZ")

        return PageDetail(
            id=page.id,
            title=page.title,
            content=page.content,
            type=page.type,
            status=page.status,
            subject=page.subject,
            tags=page.tags,
            parent_id=page.parent_id,
            content_hash=page.content_hash,
            review_interval_days=page.review_interval_days,
            created_at=page.created_at,
            updated_at=page.updated_at,
            reviewed_at=page.reviewed_at,
            next_review_at=next_review,
            parent=parent,
            sub_items=[PageTitleRef(id=child.id, title=child.title) for child in children],
            connected_to=[],
            inline_mentions=[],
        )
