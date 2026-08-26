import base64
import mimetypes
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import quote

from exceptions.attachments import (
    AttachmentNotFoundError,
    InvalidAttachmentFilenameError,
    MermaidRendererNotFoundError,
    MermaidRenderError,
)
from interfaces.services.attachments import IAttachmentService
from schemas.attachments import (
    AttachmentContent,
    AttachmentFile,
    AttachmentSummary,
    MermaidFormat,
)


class AttachmentService(IAttachmentService):
    _MERMAID_TIMEOUT_SECONDS = 30

    def __init__(self, attachments_path: Path) -> None:
        self._attachments_path = attachments_path

    def get_summary(self, filename: str) -> AttachmentSummary:
        path = self._existing_path(filename)

        return self._summary(path.name, path)

    def get_content(self, filename: str) -> AttachmentContent:
        path = self._existing_path(filename)

        return AttachmentContent(
            filename=path.name,
            data_b64=base64.b64encode(path.read_bytes()).decode(),
        )

    def get_file(self, filename: str) -> AttachmentFile:
        path = self._existing_path(filename)

        return AttachmentFile(path=path, content_type=self._content_type(path.name))

    def save(self, filename: str, data_b64: str) -> AttachmentSummary:
        path = self._target_path(filename)

        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(base64.b64decode(data_b64))

        return self._summary(path.name, path)

    def render_mermaid(
        self,
        name: str,
        diagram: str,
        output_format: MermaidFormat,
    ) -> AttachmentSummary:
        stem = self._plain_filename(name)

        if diagram.strip() == "":
            raise MermaidRenderError("diagram must not be empty")

        path = self._target_path(f"{stem}.{output_format}")
        path.parent.mkdir(parents=True, exist_ok=True)
        self._run_mmdc(diagram, path)

        return self._summary(path.name, path)

    def _existing_path(self, filename: str) -> Path:
        path = self._target_path(filename)

        if not path.is_file():
            raise AttachmentNotFoundError(path.name)

        return path

    def _target_path(self, filename: str) -> Path:
        return self._attachments_path / self._plain_filename(filename)

    def _summary(self, filename: str, path: Path) -> AttachmentSummary:
        return AttachmentSummary(
            filename=filename,
            content_type=self._content_type(filename),
            size_bytes=path.stat().st_size,
            embed=f"![[{filename}]]",
            url=f"/api/attachments/{quote(filename)}/raw",
        )

    @staticmethod
    def _plain_filename(filename: str) -> str:
        stripped = filename.strip()
        resolved = Path(stripped)

        if stripped == "" or resolved.name != stripped or resolved.is_absolute():
            raise InvalidAttachmentFilenameError(filename)

        return stripped

    @staticmethod
    def _content_type(filename: str) -> str:
        guessed = mimetypes.guess_type(filename)[0]

        if guessed is None:
            return "application/octet-stream"

        return guessed

    def _run_mmdc(self, diagram: str, output_path: Path) -> None:
        executable = shutil.which("mmdc")

        if executable is None:
            raise MermaidRendererNotFoundError()

        temporary_path: Path | None = None

        try:
            with tempfile.NamedTemporaryFile(
                suffix=".mmd",
                mode="w",
                encoding="utf-8",
                delete=False,
            ) as temporary_file:
                temporary_file.write(diagram)
                temporary_path = Path(temporary_file.name)

            result = subprocess.run(
                [executable, "-i", str(temporary_path), "-o", str(output_path), "-q"],
                capture_output=True,
                text=True,
                timeout=self._MERMAID_TIMEOUT_SECONDS,
                env=self._puppeteer_environment(),
                check=False,
            )
        except subprocess.TimeoutExpired as error:
            raise MermaidRenderError(
                f"mmdc timed out after {self._MERMAID_TIMEOUT_SECONDS}s"
            ) from error
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)

        if result.returncode != 0:
            detail = result.stderr.strip() or result.stdout.strip() or "(no output)"

            raise MermaidRenderError(f"mmdc exited with code {result.returncode}: {detail}")

    @staticmethod
    def _puppeteer_environment() -> dict[str, str]:
        environment = dict(os.environ)

        if environment.get("PUPPETEER_EXECUTABLE_PATH"):
            return environment

        chrome = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

        if chrome.exists():
            environment["PUPPETEER_EXECUTABLE_PATH"] = str(chrome)

        return environment
