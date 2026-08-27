from exceptions.app import AppError


class ExportError(AppError):
    status_code: int = 400


class ExportNotFoundError(ExportError):
    status_code = 404

    def __init__(self, identifier: str) -> None:
        super().__init__(f"Export not found: {identifier}")

        self.identifier = identifier


class ExportExistsError(ExportError):
    status_code = 409

    def __init__(self, filename: str) -> None:
        super().__init__(f"Export already exists: {filename}")

        self.filename = filename


class InvalidExportFilenameError(ExportError):
    def __init__(self, filename: str) -> None:
        super().__init__(f"Export filename is invalid: {filename}")

        self.filename = filename


class ExportScopeError(ExportError):
    def __init__(self) -> None:
        super().__init__(
            "Provide at least one of: page_ids, filter, page_type, subject, tag, "
            "or include_all=true"
        )


class ExportEmptyError(ExportError):
    def __init__(self) -> None:
        super().__init__("Export scope matched zero pages")


class ExportInspectError(ExportError):
    def __init__(self, message: str) -> None:
        super().__init__(message)
