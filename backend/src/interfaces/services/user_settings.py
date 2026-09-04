from abc import ABC, abstractmethod

from schemas.user_settings import UserSettingsResponse


class IUserSettingsService(ABC):
    """Desktop user settings stored as JSON under preferences.

    Note language is the current desktop-owned preference.
    """

    @abstractmethod
    def get_settings(self) -> UserSettingsResponse: ...

    @abstractmethod
    def update_note_language(self, note_language_name: str) -> UserSettingsResponse: ...
