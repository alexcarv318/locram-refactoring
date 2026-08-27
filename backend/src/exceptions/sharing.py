from exceptions.app import AppError


class SharingError(AppError):
    status_code: int = 400


class ShareGrantNotFoundError(SharingError):
    status_code = 404

    def __init__(self, grant_id: str) -> None:
        super().__init__(f"Base share grant {grant_id} not found")

        self.grant_id = grant_id


class SharingTargetError(SharingError):
    status_code = 409

    def __init__(self, message: str) -> None:
        super().__init__(message)


class SharingNotReadyError(SharingError):
    status_code = 409

    def __init__(self, message: str) -> None:
        super().__init__(message)
