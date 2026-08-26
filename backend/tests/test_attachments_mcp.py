import base64
from pathlib import Path

import pytest

import mcp.attachments as mcp_attachments
from exceptions.attachments import AttachmentNotFoundError, InvalidAttachmentFilenameError
from schemas.attachments import MermaidFormat
from services.attachments import AttachmentService


def test_mcp_get_and_save(mcp_attachment_service: AttachmentService) -> None:
    payload = base64.b64encode(b"tool-bytes").decode()
    saved = mcp_attachments.save_attachment("clip.txt", payload)
    fetched = mcp_attachments.get_attachment("clip.txt")

    assert saved.saved is True
    assert Path(saved.path).read_bytes() == b"tool-bytes"
    assert fetched.filename == "clip.txt"
    assert fetched.data_b64 == payload

    with pytest.raises(AttachmentNotFoundError):
        mcp_attachments.get_attachment("missing.bin")

    with pytest.raises(InvalidAttachmentFilenameError):
        mcp_attachments.save_attachment("nested/file.bin", payload)


def test_mcp_render_mermaid(
    mcp_attachment_service: AttachmentService,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def write_png(_diagram: str, output_path: Path) -> None:
        output_path.write_bytes(b"png")

    monkeypatch.setattr(mcp_attachment_service, "_run_mmdc", write_png)
    rendered = mcp_attachments.render_mermaid(
        "chart",
        "graph TD; A-->B",
        MermaidFormat.PNG,
    )

    assert rendered.rendered is True
    assert rendered.filename == "chart.png"
    assert rendered.embed == "![[chart.png]]"
    assert Path(rendered.path).read_bytes() == b"png"
