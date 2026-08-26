from dependencies import get_attachment_service as load_attachment_service
from interfaces.services.attachments import IAttachmentService
from schemas.attachments import (
    AttachmentContent,
    AttachmentSaved,
    MermaidFormat,
    MermaidRendered,
)

from .protocol import MCPServerApp


def get_attachment_service() -> IAttachmentService:
    return load_attachment_service()


def get_attachment(filename: str) -> AttachmentContent:
    return get_attachment_service().get_content(filename)


def save_attachment(filename: str, data_b64: str) -> AttachmentSaved:
    summary = get_attachment_service().save(filename, data_b64)
    attachment = get_attachment_service().get_file(summary.filename)

    return AttachmentSaved(saved=True, path=str(attachment.path))


def render_mermaid(
    name: str,
    diagram: str,
    output_format: MermaidFormat = MermaidFormat.SVG,
) -> MermaidRendered:
    summary = get_attachment_service().render_mermaid(name, diagram, output_format)
    attachment = get_attachment_service().get_file(summary.filename)

    return MermaidRendered(
        rendered=True,
        path=str(attachment.path),
        filename=summary.filename,
        embed=summary.embed,
    )


def register(mcp: MCPServerApp) -> None:
    mcp.tool()(get_attachment)
    mcp.tool()(save_attachment)
    mcp.tool()(render_mermaid)
