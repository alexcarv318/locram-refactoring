from exceptions.app import AppError


class BaseError(AppError):
    status_code: int = 400


class BaseNotFoundError(BaseError):
    status_code = 404

    def __init__(self, entry_id: str) -> None:
        super().__init__(f"Base {entry_id} not found")

        self.entry_id = entry_id


class BaseFileNotFoundError(BaseError):
    def __init__(self, path: str) -> None:
        super().__init__(f"Base file not found: {path}")

        self.path = path


class BaseFileExistsError(BaseError):
    status_code = 409

    def __init__(self, path: str) -> None:
        super().__init__(f"File already exists: {path}")

        self.path = path


class ActiveBaseError(BaseError):
    status_code = 409

    def __init__(self, entry_id: str) -> None:
        super().__init__(f"Cannot unregister or delete the active base {entry_id}")

        self.entry_id = entry_id


class WorkingBaseNotFoundError(BaseError):
    status_code = 404

    def __init__(self, base_ref: str) -> None:
        super().__init__(f"Working base not found: {base_ref}")

        self.base_ref = base_ref


class WorkingBaseReadOnlyError(BaseError):
    status_code = 403

    def __init__(self, base_ref: str) -> None:
        super().__init__(f"Working base is read-only: {base_ref}")

        self.base_ref = base_ref


class WorkingBaseMutationTargetError(BaseError):
    status_code = 409

    def __init__(self) -> None:
        super().__init__("Multiple writable local bases exist; pass an explicit base_ref")


class ManagedBaseKindError(BaseError):
    status_code = 404

    def __init__(self, kind: str) -> None:
        super().__init__(f"Unknown managed base kind: {kind}")

        self.kind = kind


class ManagedBaseLocaleError(BaseError):
    def __init__(self, kind: str) -> None:
        super().__init__(f"Managed base {kind} does not accept a locale")

        self.kind = kind


class ManagedBaseSeedError(BaseError):
    status_code = 500

    def __init__(self, kind: str) -> None:
        super().__init__(f"Packaged seed for managed base {kind} is missing")

        self.kind = kind
