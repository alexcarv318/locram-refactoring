from sqlalchemy import select

from database import BaseRepository
from interfaces.repositories.changes import IChangeRepository
from models.changes import ChangeEvent, ChangeVersion


class ChangeRepository(BaseRepository, IChangeRepository):
    def get_version(self) -> ChangeVersion:
        version = self.db.get(ChangeVersion, "global")

        if version is None:
            version = ChangeVersion(id="global", version=0, updated_at="")
            self.db.add(version)
            self.db.flush()

        return version

    def list_events(self, after_version: int, through_version: int) -> list[ChangeEvent]:
        statement = (
            select(ChangeEvent)
            .where(
                ChangeEvent.version > after_version,
                ChangeEvent.version <= through_version,
            )
            .order_by(ChangeEvent.version, ChangeEvent.id)
        )

        return list(self.db.scalars(statement))
