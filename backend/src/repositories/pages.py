from datetime import UTC, datetime
from hashlib import md5

from sqlalchemy import func, select, text

from database import BaseRepository
from interfaces.repositories.pages import IPageRepository
from models.pages import Page
from schemas.pages import PageSearchHit, PageStatus, PageSummary, PageType


class PageRepository(BaseRepository, IPageRepository):
    def get(self, page_id: str) -> Page | None:
        return self.db.get(Page, page_id)

    def create(self, page: Page) -> Page:
        now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

        page.created_at = now
        page.updated_at = now
        page.content_hash = md5(page.content.encode()).hexdigest()

        self.db.add(page)
        self.db.flush()
        self.db.commit()
        return page

    def save(self, page: Page) -> Page:
        page.updated_at = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        page.content_hash = md5(page.content.encode()).hexdigest()

        saved = self.db.merge(page)
        self.db.flush()
        self.db.commit()
        return saved

    def soft_delete(self, page_id: str) -> bool:
        page = self.get(page_id)

        if page is None:
            return False

        page.status = PageStatus.TO_DELETE
        self.save(page)
        return True

    def restore(self, page_id: str) -> bool:
        page = self.get(page_id)

        if page is None:
            return False

        if page.status is not PageStatus.TO_DELETE:
            return False

        page.status = PageStatus.ACTIVE
        self.save(page)
        return True

    def purge(self, page_id: str) -> bool:
        page = self.get(page_id)

        if page is None:
            return False

        if page.status is not PageStatus.TO_DELETE:
            return False

        self.db.delete(page)
        self.db.flush()
        self.db.commit()
        return True

    def mark_reviewed(self, page_id: str, reviewed_at: str) -> Page | None:
        page = self.get(page_id)

        if page is None:
            return None

        page.reviewed_at = reviewed_at
        return self.save(page)

    def list_pages(
        self,
        status: PageStatus,
        parent_id: str | None,
        roots_only: bool,
        limit: int,
        offset: int,
    ) -> list[PageSummary]:
        statement = select(Page).where(Page.status == status)

        if roots_only:
            statement = statement.where(Page.parent_id.is_(None))
        elif parent_id is not None:
            statement = statement.where(Page.parent_id == parent_id)

        statement = statement.order_by(Page.updated_at.desc()).limit(limit).offset(offset)
        pages = list(self.db.scalars(statement))
        return [self._to_summary(page) for page in pages]

    def search(self, query: str, limit: int) -> list[PageSearchHit]:
        tokens = [token.replace('"', "") for token in query.strip().split() if token]

        if not tokens:
            return []

        match = " AND ".join(f'"{token}"' for token in tokens)
        rows = (
            self.db.execute(
                text(
                    """
                    SELECT
                        p.id,
                        p.title,
                        p.type,
                        p.status,
                        snippet(pages_search_index, 1, '<b>', '</b>', '…', 32) AS snippet,
                        bm25(pages_search_index) AS rank
                    FROM pages_search_index
                    JOIN pages p ON pages_search_index.rowid = p.rowid
                    WHERE pages_search_index MATCH :query
                      AND p.status = 'active'
                    ORDER BY rank
                    LIMIT :limit
                    """
                ),
                {"query": match, "limit": limit},
            )
            .mappings()
            .fetchall()
        )

        return [
            PageSearchHit(
                id=str(row["id"]),
                title=str(row["title"]),
                type=PageType(str(row["type"])),
                status=PageStatus(str(row["status"])),
                snippet=str(row["snippet"]),
                rank=float(row["rank"]) if row["rank"] is not None else None,
            )
            for row in rows
        ]

    def list_children(self, parent_id: str) -> list[Page]:
        statement = (
            select(Page)
            .where(Page.parent_id == parent_id, Page.status == PageStatus.ACTIVE)
            .order_by(Page.title)
        )
        return list(self.db.scalars(statement))

    def list_visible_pages(self) -> list[PageSummary]:
        statement = (
            select(Page)
            .where(Page.status != PageStatus.TO_DELETE)
            .order_by(Page.updated_at.desc())
        )

        return [self._to_summary(page) for page in self.db.scalars(statement)]

    def _to_summary(self, page: Page) -> PageSummary:
        child_count = self.db.scalar(
            select(func.count())
            .select_from(Page)
            .where(Page.parent_id == page.id, Page.status == PageStatus.ACTIVE)
        )
        descendant_count = self._active_descendant_count(page.id)

        return PageSummary(
            id=page.id,
            title=page.title,
            type=page.type,
            status=page.status,
            subject=page.subject,
            tags=page.tags,
            parent_id=page.parent_id,
            created_at=page.created_at,
            updated_at=page.updated_at,
            reviewed_at=page.reviewed_at,
            review_interval_days=page.review_interval_days,
            child_count=child_count or 0,
            active_descendant_count=descendant_count,
        )

    def _active_descendant_count(self, page_id: str) -> int:
        children = list(
            self.db.scalars(
                select(Page.id).where(
                    Page.parent_id == page_id,
                    Page.status == PageStatus.ACTIVE,
                )
            )
        )

        return len(children) + sum(
            self._active_descendant_count(child_id) for child_id in children
        )
