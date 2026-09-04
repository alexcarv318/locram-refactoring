from exceptions.app import AppError


class AccessError(AppError):
    status_code: int = 400

    def __init__(self, message: str, status_code: int = 400) -> None:
        self.status_code = status_code
        super().__init__(message)


class TransferRequiredError(AccessError):
    def __init__(self, transfer_session_id: str) -> None:
        self.transfer_session_id = transfer_session_id
        super().__init__(
            "Pro is already active on another device. "
            "Transfer activation to this device from your account.",
            409,
        )


class EditionCapabilityError(AccessError):
    code = "EDITION_CAPABILITY_DENIED"

    def __init__(self, capability: str) -> None:
        self.capability = capability
        super().__init__(
            f"This desktop edition cannot use {capability.replace('_', ' ')}.",
            403,
        )
