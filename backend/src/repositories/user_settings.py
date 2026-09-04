from pathlib import Path

from pydantic import ValidationError

from interfaces.repositories.user_settings import IUserSettingsRepository
from schemas.user_settings import DEFAULT_NOTE_LANGUAGE_NAME, UserSettingsRecord


class UserSettingsRepository(IUserSettingsRepository):
    def __init__(self, path: Path) -> None:
        self._path = path

    def load(self) -> UserSettingsRecord:
        if not self._path.is_file():
            return UserSettingsRecord()

        try:
            return UserSettingsRecord.model_validate_json(self._path.read_text())
        except (OSError, ValidationError):
            return UserSettingsRecord(note_language_name=DEFAULT_NOTE_LANGUAGE_NAME)

    def save(self, settings: UserSettingsRecord) -> UserSettingsRecord:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(settings.model_dump_json(indent=2))

        return settings
