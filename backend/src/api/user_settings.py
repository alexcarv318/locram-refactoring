from fastapi import APIRouter, Depends

from dependencies import get_user_settings_service
from exceptions.user_settings import UserSettingsError
from interfaces.services.user_settings import IUserSettingsService
from schemas.user_settings import UserSettingsPatch, UserSettingsResponse

user_settings_router = APIRouter(prefix="/api/desktop")


@user_settings_router.get("/user-settings", response_model=UserSettingsResponse)
def get_user_settings(
    user_settings_service: IUserSettingsService = Depends(get_user_settings_service),
) -> UserSettingsResponse:
    return user_settings_service.get_settings()


@user_settings_router.patch("/user-settings", response_model=UserSettingsResponse)
def patch_user_settings(
    payload: UserSettingsPatch,
    user_settings_service: IUserSettingsService = Depends(get_user_settings_service),
) -> UserSettingsResponse:
    if payload.note_language_name is None:
        raise UserSettingsError("At least one supported user-settings field must be provided")

    return user_settings_service.update_note_language(payload.note_language_name)
