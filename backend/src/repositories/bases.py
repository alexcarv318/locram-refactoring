from sqlalchemy import select

from database import BaseRepository
from interfaces.repositories.bases import IBaseRegistryRepository
from models.bases import RegistryEntry


class BaseRegistryRepository(BaseRepository, IBaseRegistryRepository):
    def get(self, entry_id: str) -> RegistryEntry | None:
        return self.db.get(RegistryEntry, entry_id)

    def get_by_path(self, path: str) -> RegistryEntry | None:
        return self.db.scalar(select(RegistryEntry).where(RegistryEntry.path == path))

    def get_active(self) -> RegistryEntry | None:
        return self.db.scalar(select(RegistryEntry).where(RegistryEntry.is_active.is_(True)))

    def list_entries(self) -> list[RegistryEntry]:
        return list(self.db.scalars(select(RegistryEntry).order_by(RegistryEntry.created_at)))

    def save(self, entry: RegistryEntry) -> RegistryEntry:
        saved = self.db.merge(entry)
        self.db.flush()
        self.db.commit()
        return saved

    def delete(self, entry_id: str) -> None:
        entry = self.get(entry_id)

        if entry is None:
            return

        self.db.delete(entry)
        self.db.flush()
        self.db.commit()

    def set_active(self, entry_id: str) -> None:
        for entry in self.list_entries():
            entry.is_active = entry.entry_id == entry_id
            self.db.merge(entry)

        self.db.flush()
        self.db.commit()
