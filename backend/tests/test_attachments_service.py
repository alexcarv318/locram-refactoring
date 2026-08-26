import base64
from pathlib import Path

import pytest

from exceptions.attachments import (
    AttachmentNotFoundError,
    InvalidAttachmentFilenameError,
    MermaidRendererNotFoundError,
    MermaidRenderError,
)
from schemas.attachments import MermaidFormat
from services.attachments import AttachmentService


def test_save_get_overwrite_and_missing(attachment_service: AttachmentService) -> None:
    payload = base64.b64encode(b"hello").decode()
    saved = attachment_service.save("note.txt", payload)
    fetched = attachment_service.get_summary("note.txt")
    content = attachment_service.get_content("note.txt")
    raw = attachment_service.get_file("note.txt")

    assert saved.filename == "note.txt"
    assert saved.embed == "![[note.txt]]"
    assert saved.url == "/api/attachments/note.txt/raw"
    assert saved.content_type == "text/plain"
    assert fetched.size_bytes == 5
    assert content.data_b64 == payload
    assert raw.path.read_bytes() == b"hello"

    attachment_service.save("note.txt", base64.b64encode(b"next").decode())

    assert attachment_service.get_file("note.txt").path.read_bytes() == b"next"

    with pytest.raises(AttachmentNotFoundError):
        attachment_service.get_summary("missing.png")


def test_filename_must_be_plain(attachment_service: AttachmentService) -> None:
    payload = base64.b64encode(b"x").decode()

    with pytest.raises(InvalidAttachmentFilenameError):
        attachment_service.save("", payload)

    with pytest.raises(InvalidAttachmentFilenameError):
        attachment_service.save("../escape.png", payload)

    with pytest.raises(InvalidAttachmentFilenameError):
        attachment_service.save("nested/file.png", payload)

    with pytest.raises(InvalidAttachmentFilenameError):
        attachment_service.save("/tmp/absolute.png", payload)


def test_render_mermaid_writes_named_file(
    attachment_service: AttachmentService,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def write_svg(_diagram: str, output_path: Path) -> None:
        output_path.write_text("<svg></svg>")

    monkeypatch.setattr(attachment_service, "_run_mmdc", write_svg)
    rendered = attachment_service.render_mermaid(
        "flow",
        "graph TD; A-->B",
        MermaidFormat.SVG,
    )

    assert rendered.filename == "flow.svg"
    assert rendered.embed == "![[flow.svg]]"
    assert attachment_service.get_file("flow.svg").path.read_text() == "<svg></svg>"

    with pytest.raises(MermaidRenderError):
        attachment_service.render_mermaid("empty", "   ", MermaidFormat.SVG)


def test_render_mermaid_requires_mmdc(
    attachment_service: AttachmentService,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("services.attachments.shutil.which", lambda _name: None)

    with pytest.raises(MermaidRendererNotFoundError):
        attachment_service.render_mermaid("flow", "graph TD; A-->B", MermaidFormat.SVG)
