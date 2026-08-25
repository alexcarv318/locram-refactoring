from datetime import UTC, datetime

from sqlalchemy import Engine, or_, select
from sqlalchemy.orm import Session, sessionmaker

from database import Base, create_session_factory
from interfaces.repositories.links import ILinkRepository
from models.links import Link
from schemas.links import LinkType


class LinkRepository(ILinkRepository):
    def __init__(self, engine: Engine) -> None:
        self._engine = engine
        self._session_factory: sessionmaker[Session] = create_session_factory(engine)
        self.initialize()

    def initialize(self) -> None:
        Base.metadata.create_all(self._engine)

    def create(self, link: Link) -> bool:
        with self._session_factory() as session:
            existing = session.get(
                Link,
                (link.source_id, link.target_id, link.link_type),
            )

            if existing is not None:
                return False

            if link.created_at == "":
                link.created_at = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

            session.add(link)
            session.commit()
            return True

    def delete(
        self,
        source_id: str,
        target_id: str,
        link_type: LinkType | None,
    ) -> None:
        with self._session_factory() as session:
            statement = select(Link).where(
                Link.source_id == source_id,
                Link.target_id == target_id,
            )

            if link_type is not None:
                statement = statement.where(Link.link_type == link_type)

            for link in session.scalars(statement):
                session.delete(link)

            session.commit()

    def list_for_page(self, page_id: str) -> list[Link]:
        with self._session_factory() as session:
            statement = select(Link).where(
                or_(Link.source_id == page_id, Link.target_id == page_id)
            )
            links = list(session.scalars(statement))

            for link in links:
                session.expunge(link)

            return links
