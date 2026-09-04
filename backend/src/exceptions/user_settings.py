from exceptions.app import AppError


class UserSettingsError(AppError):
    status_code: int = 400
