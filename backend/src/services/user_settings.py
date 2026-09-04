from exceptions.user_settings import UserSettingsError
from interfaces.repositories.user_settings import IUserSettingsRepository
from interfaces.services.user_settings import IUserSettingsService
from schemas.user_settings import (
    DEFAULT_NOTE_LANGUAGE_NAME,
    NOTE_LANGUAGE_NAMES,
    UserSettingsRecord,
    UserSettingsResponse,
)


class UserSettingsService(IUserSettingsService):
    def __init__(self, user_settings_repository: IUserSettingsRepository) -> None:
        self._user_settings_repository = user_settings_repository

    def get_settings(self) -> UserSettingsResponse:
        return self._to_response(self._user_settings_repository.load())

    def update_note_language(self, note_language_name: str) -> UserSettingsResponse:
        normalized = " ".join(note_language_name.strip().split())

        if normalized == "":
            raise UserSettingsError("noteLanguageName must not be empty")

        if normalized not in NOTE_LANGUAGE_NAMES:
            raise UserSettingsError("noteLanguageName must be one of the supported values")

        saved = self._user_settings_repository.save(
            UserSettingsRecord(note_language_name=normalized)
        )

        return self._to_response(saved)

    @staticmethod
    def _to_response(settings: UserSettingsRecord) -> UserSettingsResponse:
        language = settings.note_language_name

        if language not in NOTE_LANGUAGE_NAMES:
            language = DEFAULT_NOTE_LANGUAGE_NAME

        return UserSettingsResponse(
            note_language_name=language,
            note_language_options=list(NOTE_LANGUAGE_NAMES),
            effective_now=True,
        )
