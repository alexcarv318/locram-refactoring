from datetime import UTC, datetime

from sqlalchemy import or_, select

from database import BaseRepository
from exceptions.sharing import SharedBaseOperationError
from interfaces.repositories.links import ILinkRepository
from interfaces.repositories.sharing import IShareSession
from models.links import Link
from schemas.links import LinkType


class LinkRepository(BaseRepository, ILinkRepository):
    def create(self, link: Link) -> bool:
        existing = self.db.get(
            Link,
            (link.source_id, link.target_id, link.link_type),
        )

        if existing is not None:
            return False

        if link.created_at == "":
            link.created_at = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

        self.db.add(link)
        self.db.flush()
        self.db.commit()
        return True

    def delete(
        self,
        source_id: str,
        target_id: str,
        link_type: LinkType | None,
    ) -> None:
        statement = select(Link).where(
            Link.source_id == source_id,
            Link.target_id == target_id,
        )

        if link_type is not None:
            statement = statement.where(Link.link_type == link_type)

        for link in self.db.scalars(statement):
            self.db.delete(link)

        self.db.flush()
        self.db.commit()

    def list_for_page(self, page_id: str) -> list[Link]:
        statement = select(Link).where(
            or_(Link.source_id == page_id, Link.target_id == page_id)
        )
        return list(self.db.scalars(statement))

    def list_linked_page_ids(self) -> list[str]:
        linked_ids: set[str] = set()

        for source_id, target_id in self.db.execute(select(Link.source_id, Link.target_id)):
            linked_ids.add(source_id)
            linked_ids.add(target_id)

        return list(linked_ids)


class RemoteLinkRepository(ILinkRepository):
    def __init__(self, session: IShareSession) -> None:
        self._session = session

    def create(self, link: Link) -> bool:
        raise SharedBaseOperationError()

    def delete(
        self,
        source_id: str,
        target_id: str,
        link_type: LinkType | None,
    ) -> None:
        raise SharedBaseOperationError()

    def list_for_page(self, page_id: str) -> list[Link]:
        detail = self._session.get_page(page_id)

        if detail is None:
            return []

        links: list[Link] = []

        for connection in detail.connected_to:
            if connection.direction == "incoming":
                source_id = connection.id
                target_id = page_id
            else:
                source_id = page_id
                target_id = connection.id

            links.append(
                Link(
                    source_id=source_id,
                    target_id=target_id,
                    link_type=LinkType(connection.link_type),
                )
            )

        return links

    def list_linked_page_ids(self) -> list[str]:
        raise SharedBaseOperationError()
