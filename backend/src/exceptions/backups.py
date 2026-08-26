from exceptions.app import AppError


class BackupError(AppError):
    status_code: int = 400


class BackupNotFoundError(BackupError):
    status_code = 404

    def __init__(self, filename: str) -> None:
        super().__init__(f"Backup not found: {filename}")

        self.filename = filename


class BackupExistsError(BackupError):
    status_code = 409

    def __init__(self, filename: str) -> None:
        super().__init__(f"Backup already exists: {filename}")

        self.filename = filename


class InvalidBackupFilenameError(BackupError):
    def __init__(self, filename: str) -> None:
        super().__init__(f"Backup filename is invalid: {filename}")

        self.filename = filename


class BackupRestoreError(BackupError):
    def __init__(self, message: str) -> None:
        super().__init__(message)
