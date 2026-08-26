import base64
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from services.attachments import AttachmentService


def test_http_attachment_roundtrip(client: TestClient) -> None:
    payload = base64.b64encode(b"image-bytes").decode()
    created = client.post(
        "/api/attachments",
        json={"filename": "shot.png", "data_b64": payload},
    )

    assert created.status_code == 201
    assert created.json()["item"]["filename"] == "shot.png"
    assert created.json()["item"]["embed"] == "![[shot.png]]"
    assert created.json()["item"]["url"] == "/api/attachments/shot.png/raw"

    fetched = client.get("/api/attachments/shot.png")
    raw = client.get("/api/attachments/shot.png/raw")

    assert fetched.status_code == 200
    assert fetched.json()["item"]["size_bytes"] == 11
    assert raw.status_code == 200
    assert raw.content == b"image-bytes"
    assert raw.headers["content-type"].startswith("image/png")


def test_http_attachment_errors(client: TestClient) -> None:
    missing = client.get("/api/attachments/missing.png")
    raw_missing = client.get("/api/attachments/missing.png/raw")
    invalid = client.post(
        "/api/attachments",
        json={"filename": "../escape.png", "data_b64": base64.b64encode(b"x").decode()},
    )

    assert missing.status_code == 404
    assert raw_missing.status_code == 404
    assert invalid.status_code == 400


def test_http_render_mermaid(
    client: TestClient,
    attachment_service: AttachmentService,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def write_svg(_diagram: str, output_path: Path) -> None:
        output_path.write_text("<svg>ok</svg>")

    monkeypatch.setattr(attachment_service, "_run_mmdc", write_svg)
    created = client.post(
        "/api/attachments/render-mermaid",
        json={"name": "diagram", "diagram": "graph TD; A-->B"},
    )

    assert created.status_code == 201
    assert created.json()["item"]["filename"] == "diagram.svg"
    assert created.json()["item"]["embed"] == "![[diagram.svg]]"

    empty = client.post(
        "/api/attachments/render-mermaid",
        json={"name": "blank", "diagram": "  "},
    )
    bad_format = client.post(
        "/api/attachments/render-mermaid",
        json={"name": "x", "diagram": "graph TD; A-->B", "output_format": "pdf"},
    )

    assert empty.status_code == 400
    assert bad_format.status_code == 422
