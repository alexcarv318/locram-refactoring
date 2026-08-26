from datetime import UTC, datetime

from sqlalchemy import or_, select

from database import BaseRepository
from interfaces.repositories.links import ILinkRepository
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
