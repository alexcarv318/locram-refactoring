from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from dependencies import get_attachment_service
from interfaces.services.attachments import IAttachmentService
from schemas.attachments import (
    AttachmentCreate,
    AttachmentResponse,
    MermaidRenderRequest,
)

attachments_router = APIRouter(prefix="/api/attachments")


@attachments_router.get("/{filename}/raw")
def get_attachment_raw(
    filename: str,
    attachment_service: IAttachmentService = Depends(get_attachment_service),
) -> FileResponse:
    attachment = attachment_service.get_file(filename)

    return FileResponse(attachment.path, media_type=attachment.content_type)


@attachments_router.get("/{filename}", response_model=AttachmentResponse)
def get_attachment(
    filename: str,
    attachment_service: IAttachmentService = Depends(get_attachment_service),
) -> AttachmentResponse:
    return AttachmentResponse(item=attachment_service.get_summary(filename))


@attachments_router.post("", response_model=AttachmentResponse, status_code=201)
def save_attachment(
    payload: AttachmentCreate,
    attachment_service: IAttachmentService = Depends(get_attachment_service),
) -> AttachmentResponse:
    return AttachmentResponse(item=attachment_service.save(payload.filename, payload.data_b64))


@attachments_router.post("/render-mermaid", response_model=AttachmentResponse, status_code=201)
def render_mermaid(
    payload: MermaidRenderRequest,
    attachment_service: IAttachmentService = Depends(get_attachment_service),
) -> AttachmentResponse:
    return AttachmentResponse(
        item=attachment_service.render_mermaid(
            payload.name,
            payload.diagram,
            payload.output_format,
        )
    )
