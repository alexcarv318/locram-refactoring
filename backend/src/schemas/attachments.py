from enum import StrEnum
from pathlib import Path

from pydantic import BaseModel


class MermaidFormat(StrEnum):
    SVG = "svg"
    PNG = "png"


class AttachmentSummary(BaseModel):
    filename: str
    content_type: str
    size_bytes: int
    embed: str
    url: str


class AttachmentFile(BaseModel):
    path: Path
    content_type: str


class AttachmentContent(BaseModel):
    filename: str
    data_b64: str


class AttachmentSaved(BaseModel):
    saved: bool
    path: str


class MermaidRendered(BaseModel):
    rendered: bool
    path: str
    filename: str
    embed: str


class AttachmentCreate(BaseModel):
    filename: str
    data_b64: str


class MermaidRenderRequest(BaseModel):
    name: str
    diagram: str
    output_format: MermaidFormat = MermaidFormat.SVG


class AttachmentResponse(BaseModel):
    item: AttachmentSummary
