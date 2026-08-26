from exceptions.app import AppError


class AttachmentError(AppError):
    status_code: int = 400


class InvalidAttachmentFilenameError(AttachmentError):
    def __init__(self, filename: str) -> None:
        super().__init__(
            f"filename must be a plain filename with no path separators: {filename!r}"
        )

        self.filename = filename


class AttachmentNotFoundError(AttachmentError):
    status_code = 404

    def __init__(self, filename: str) -> None:
        super().__init__(f"Attachment '{filename}' not found")

        self.filename = filename


class MermaidRendererNotFoundError(AttachmentError):
    def __init__(self) -> None:
        super().__init__(
            "mmdc not found on PATH — install with: npm install -g @mermaid-js/mermaid-cli"
        )


class MermaidRenderError(AttachmentError):
    def __init__(self, message: str) -> None:
        super().__init__(message)
