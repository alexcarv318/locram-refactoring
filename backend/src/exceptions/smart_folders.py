from exceptions.app import AppError


class SmartFolderError(AppError):
    status_code: int = 400


class SmartFolderNotFoundError(SmartFolderError):
    status_code = 404

    def __init__(self, preset_id: str) -> None:
        super().__init__(f"Smart folder preset {preset_id} not found")

        self.preset_id = preset_id


class SmartFolderNameError(SmartFolderError):
    def __init__(self) -> None:
        super().__init__("Field 'name' is required")


class SmartFolderUpdateError(SmartFolderError):
    def __init__(self) -> None:
        super().__init__("Provide name or filter")


class SmartFolderPreviewError(SmartFolderError):
    def __init__(self) -> None:
        super().__init__("Provide exactly one of preset_id or filter_state")


class SmartFolderStorageError(SmartFolderError):
    status_code = 500

    def __init__(self, path: str) -> None:
        super().__init__(f"Could not read or write preset storage at {path}")

        self.path = path
