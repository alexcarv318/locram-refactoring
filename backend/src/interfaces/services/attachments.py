from abc import ABC, abstractmethod

from schemas.attachments import (
    AttachmentContent,
    AttachmentFile,
    AttachmentSummary,
    MermaidFormat,
)


class IAttachmentService(ABC):
    """Attachments: files on disk under locram home.

    Upload, read, raw serve, and Mermaid render. Pages embed them as ![[filename]].
    """

    @abstractmethod
    def get_summary(self, filename: str) -> AttachmentSummary: ...

    @abstractmethod
    def get_content(self, filename: str) -> AttachmentContent: ...

    @abstractmethod
    def get_file(self, filename: str) -> AttachmentFile: ...

    @abstractmethod
    def save(self, filename: str, data_b64: str) -> AttachmentSummary: ...

    @abstractmethod
    def render_mermaid(
        self,
        name: str,
        diagram: str,
        output_format: MermaidFormat,
    ) -> AttachmentSummary: ...
