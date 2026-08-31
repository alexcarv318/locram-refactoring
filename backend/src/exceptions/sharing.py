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


class SharedBaseOperationError(SharingError):
    status_code = 403

    def __init__(
        self,
        message: str = "This operation is not available on a shared base",
    ) -> None:
        super().__init__(message)


class ShareReacceptRequiredError(SharingError):
    status_code = 409

    def __init__(self) -> None:
        super().__init__("Share must be accepted again before it can be used")


class SharedBaseRequestError(SharingError):
    status_code = 502

    def __init__(self, message: str) -> None:
        super().__init__(message)


class SharedBaseSessionError(SharingError):
    def __init__(self, error_code: str, message: str, status_code: int) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.status_code = status_code
