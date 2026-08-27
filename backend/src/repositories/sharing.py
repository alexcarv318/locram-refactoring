from sqlalchemy import select

from database import BaseRepository
from interfaces.repositories.sharing import ISharingRepository
from models.sharing import BaseShareGrant


class SharingRepository(BaseRepository, ISharingRepository):
    def get(self, grant_id: str) -> BaseShareGrant | None:
        return self.db.get(BaseShareGrant, grant_id)

    def list_owner(self, owner_actor_ref: str) -> list[BaseShareGrant]:
        return list(
            self.db.scalars(
                select(BaseShareGrant)
                .where(BaseShareGrant.owner_actor_ref == owner_actor_ref)
                .order_by(BaseShareGrant.created_at.desc())
            )
        )

    def save(self, grant: BaseShareGrant) -> BaseShareGrant:
        saved = self.db.merge(grant)
        self.db.flush()
        self.db.commit()
        return saved

    def delete(self, grant_id: str) -> None:
        grant = self.get(grant_id)

        if grant is None:
            return

        self.db.delete(grant)
        self.db.flush()
        self.db.commit()
