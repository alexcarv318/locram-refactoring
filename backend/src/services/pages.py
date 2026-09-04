import re
from datetime import UTC, datetime, timedelta

from ulid import ULID

from exceptions.pages import (
    AmbiguousTitleError,
    HubParentError,
    PageNotDeletedError,
    PageNotFoundError,
    PagePromotionError,
    PageTextNotFoundError,
)
from interfaces.repositories.links import ILinkRepository
from interfaces.repositories.pages import IPageRepository
from interfaces.services.embeddings import IEmbeddingService
from interfaces.services.pages import IPageService
from models.pages import Page
from schemas.links import InlineLinkResponse, ParentSetResponse
from schemas.pages import (
    MATURITY_PROMOTIONS,
    PageAncestor,
    PageConnection,
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
    _CANONICAL_INLINE_LINK_PATTERN = re.compile(r"(?<!!)\[\[([A-Z0-9]{26})\|([^\[\]]+?)\]\]")

    def __init__(
        self,
        page_repository: IPageRepository,
        link_repository: ILinkRepository,
        embedding_service: IEmbeddingService | None = None,
    ) -> None:
        self._page_repository = page_repository
        self._link_repository = link_repository
        self._embedding_service = embedding_service

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
        self._embed_page(created.id)

        return self._to_detail(created)

    def get_page(self, page_id: str) -> PageDetail:
        page = self._page_repository.get(page_id)

        if page is not None:
            return self._to_detail(page)

        identifier = page_id.strip()
        matches = self._page_repository.find_by_title(identifier)

        if len(matches) > 1:
            raise AmbiguousTitleError(identifier, len(matches))

        if len(matches) == 1:
            page = self._page_repository.get(matches[0].id)

            if page is not None:
                return self._to_detail(page)

        raise PageNotFoundError(page_id)

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
        self._embed_page(updated.id)

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

    def set_parent(self, child_id: str, parent_id: str | None) -> ParentSetResponse:
        if parent_id is not None:
            parent = self._page_repository.get(parent_id)

            if parent is None:
                raise PageNotFoundError(parent_id)

        updated = self.update_page(child_id, PageUpdate(parent_id=parent_id))

        return ParentSetResponse(child_id=updated.id, parent_id=updated.parent_id)

    def replace_in_page(self, page_id: str, old_text: str, new_text: str) -> PageDetail:
        page = self._page_repository.get(page_id)

        if page is None:
            raise PageNotFoundError(page_id)

        if old_text not in page.content:
            raise PageTextNotFoundError(page_id)

        return self.update_page(
            page_id,
            PageUpdate(content=page.content.replace(old_text, new_text, 1)),
        )

    def get_inline_link(self, page_id: str) -> InlineLinkResponse:
        page = self.get_page(page_id)

        return InlineLinkResponse(link=f"[[{page.id}|{page.title}]]")

    def _embed_page(self, page_id: str) -> None:
        if self._embedding_service is None:
            return

        self._embedding_service.embed_page(page_id)

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
            connected_to=self._connected_to(page),
            inline_mentions=self._inline_mentions(page.content),
        )

    def _connected_to(self, page: Page) -> list[PageConnection]:
        connections: list[PageConnection] = []

        for link in self._link_repository.list_for_page(page.id):
            other_id = link.target_id if link.source_id == page.id else link.source_id
            other = self._page_repository.get(other_id)

            if other is None:
                continue

            direction = "outgoing" if link.source_id == page.id else "incoming"
            connections.append(
                PageConnection(
                    id=other.id,
                    title=other.title,
                    link_type=link.link_type.value,
                    direction=direction,
                )
            )

        return connections

    def _inline_mentions(self, content: str) -> list[PageTitleRef]:
        mentions: list[PageTitleRef] = []
        seen: set[str] = set()

        for page_id, display_title in self._CANONICAL_INLINE_LINK_PATTERN.findall(content):
            if page_id in seen:
                continue

            seen.add(page_id)
            page = self._page_repository.get(page_id)
            title = page.title if page is not None else display_title
            mentions.append(PageTitleRef(id=page_id, title=title))

        return mentions
