from exceptions.links import SelfLinkError
from exceptions.pages import PageNotFoundError
from interfaces.repositories.links import ILinkRepository
from interfaces.repositories.pages import IPageRepository
from interfaces.services.links import ILinkService
from models.links import Link
from models.pages import Page
from schemas.links import (
    LINK_INVERSES,
    BatchLinkResult,
    GraphScopeKind,
    LinkCreate,
    LinkedPagesResponse,
    LinkType,
    PageGraph,
    PageGraphLink,
    PageGraphNode,
    UnlinkedPagesResponse,
)
from schemas.pages import PageType


class LinkService(ILinkService):
    def __init__(
        self,
        link_repository: ILinkRepository,
        page_repository: IPageRepository,
    ) -> None:
        self._link_repository = link_repository
        self._page_repository = page_repository

    def link_pages(
        self,
        source_id: str,
        target_id: str,
        link_type: LinkType,
    ) -> LinkedPagesResponse:
        if source_id == target_id:
            raise SelfLinkError

        source = self._page_repository.get(source_id)

        if source is None:
            raise PageNotFoundError(source_id)

        target = self._page_repository.get(target_id)

        if target is None:
            raise PageNotFoundError(target_id)

        created_primary = self._link_repository.create(
            Link(source_id=source_id, target_id=target_id, link_type=link_type)
        )
        created_inverse = False
        inverse = LINK_INVERSES.get(link_type)

        if inverse is not None:
            created_inverse = self._link_repository.create(
                Link(source_id=target_id, target_id=source_id, link_type=inverse)
            )

        created = created_primary or created_inverse

        return LinkedPagesResponse(
            source_id=source_id,
            target_id=target_id,
            link_type=link_type,
            created=created,
            already_exists=not created,
            created_primary=created_primary,
            created_inverse=created_inverse,
        )

    def unlink_pages(
        self,
        source_id: str,
        target_id: str,
        link_type: LinkType | None,
    ) -> UnlinkedPagesResponse:
        if link_type is None:
            self._link_repository.delete(source_id, target_id, None)
            self._link_repository.delete(target_id, source_id, None)

            return UnlinkedPagesResponse(unlinked=True)

        self._link_repository.delete(source_id, target_id, link_type)
        inverse = LINK_INVERSES.get(link_type)

        if inverse is not None:
            self._link_repository.delete(target_id, source_id, inverse)

        return UnlinkedPagesResponse(unlinked=True)

    def batch_link(self, links: list[LinkCreate]) -> BatchLinkResult:
        created = 0
        skipped = 0
        errors: list[str] = []

        for item in links:
            try:
                result = self.link_pages(item.source_id, item.target_id, item.link_type)
            except (SelfLinkError, PageNotFoundError) as error:
                errors.append(str(error))
                continue

            if result.created:
                created += 1
            else:
                skipped += 1

        return BatchLinkResult(created=created, skipped=skipped, errors=errors)

    def get_page_graph(self, page_id: str, expand_hops: int) -> PageGraph:
        seed = self._page_repository.get(page_id)

        if seed is None:
            raise PageNotFoundError(page_id)

        nodes, links = self.collect_neighborhood([page_id], expand_hops)

        return PageGraph(
            selected_page_id=seed.id,
            scope_kind=self._scope_kind(seed.type),
            nodes=nodes,
            links=links,
        )

    def collect_neighborhood(
        self,
        seed_ids: list[str],
        expand_hops: int,
    ) -> tuple[list[PageGraphNode], list[PageGraphLink]]:
        hops = min(max(expand_hops, 1), 5)
        pages: dict[str, Page] = {}
        edges: list[PageGraphLink] = []
        frontier: list[str] = []

        for seed_id in seed_ids:
            page = self._page_repository.get(seed_id)

            if page is None:
                continue

            if page.id in pages:
                continue

            pages[page.id] = page
            frontier.append(page.id)

        for _hop in range(hops):
            next_frontier: list[str] = []

            for current_id in frontier:
                current = pages[current_id]
                self._add_parent_edge(current, pages, edges, next_frontier)
                self._add_child_edges(current, pages, edges, next_frontier)
                self._add_typed_edges(current, pages, edges, next_frontier)

            frontier = next_frontier

        return [self._to_node(page) for page in pages.values()], edges

    def _add_parent_edge(
        self,
        page: Page,
        pages: dict[str, Page],
        edges: list[PageGraphLink],
        next_frontier: list[str],
    ) -> None:
        if page.parent_id is None:
            return

        parent = self._remember_page(page.parent_id, pages, next_frontier)

        if parent is None:
            return

        self._add_edge(edges, page.parent_id, page.id, "parent")

    def _add_child_edges(
        self,
        page: Page,
        pages: dict[str, Page],
        edges: list[PageGraphLink],
        next_frontier: list[str],
    ) -> None:
        for child in self._page_repository.list_children(page.id):
            self._remember_loaded_page(child, pages, next_frontier)
            self._add_edge(edges, page.id, child.id, "parent")

    def _add_typed_edges(
        self,
        page: Page,
        pages: dict[str, Page],
        edges: list[PageGraphLink],
        next_frontier: list[str],
    ) -> None:
        for link in self._link_repository.list_for_page(page.id):
            other_id = link.target_id if link.source_id == page.id else link.source_id
            other = self._remember_page(other_id, pages, next_frontier)

            if other is None:
                continue

            self._add_edge(edges, link.source_id, link.target_id, link.link_type.value)

    def _remember_page(
        self,
        page_id: str,
        pages: dict[str, Page],
        next_frontier: list[str],
    ) -> Page | None:
        existing = pages.get(page_id)

        if existing is not None:
            return existing

        page = self._page_repository.get(page_id)

        if page is None:
            return None

        self._remember_loaded_page(page, pages, next_frontier)
        return page

    @staticmethod
    def _remember_loaded_page(
        page: Page,
        pages: dict[str, Page],
        next_frontier: list[str],
    ) -> None:
        if page.id in pages:
            return

        pages[page.id] = page
        next_frontier.append(page.id)

    @staticmethod
    def _add_edge(
        edges: list[PageGraphLink],
        source_id: str,
        target_id: str,
        edge_type: str,
    ) -> None:
        edge = PageGraphLink(source=source_id, target=target_id, type=edge_type)

        if edge in edges:
            return

        edges.append(edge)

    @staticmethod
    def _scope_kind(page_type: PageType) -> GraphScopeKind:
        if page_type is PageType.HUB:
            return GraphScopeKind.HUB_ANCHOR

        if page_type is PageType.STRUCTURE:
            return GraphScopeKind.STRUCTURE_ANCHOR

        return GraphScopeKind.NEIGHBORHOOD

    @staticmethod
    def _to_node(page: Page) -> PageGraphNode:
        return PageGraphNode(
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
            snippet=page.content[:160],
        )
