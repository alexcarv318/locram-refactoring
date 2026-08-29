from exceptions.app import AppError


class AccessError(AppError):
    status_code: int = 400

    def __init__(self, message: str, status_code: int = 400) -> None:
        self.status_code = status_code
        super().__init__(message)
