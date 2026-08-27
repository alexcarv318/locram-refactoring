from exceptions.app import AppError


class MergeError(AppError):
    status_code: int = 400


class MergeSourceError(MergeError):
    def __init__(self, message: str) -> None:
        super().__init__(message)
