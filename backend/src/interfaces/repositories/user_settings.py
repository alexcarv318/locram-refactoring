from abc import ABC, abstractmethod

from schemas.user_settings import UserSettingsRecord


class IUserSettingsRepository(ABC):
    @abstractmethod
    def load(self) -> UserSettingsRecord: ...

    @abstractmethod
    def save(self, settings: UserSettingsRecord) -> UserSettingsRecord: ...
