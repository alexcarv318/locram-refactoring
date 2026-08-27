from pydantic import BaseModel, Field

from schemas.smart_folders import FilterState


class ExportScope(BaseModel):
    page_ids: list[str] = Field(default_factory=list)
    filter: FilterState | None = None
    preset_id: str | None = None
    page_type: str | None = None
    status: str | None = None
    subject: str | None = None
    tag: str | None = None
    include_all: bool = False
    package_label: str | None = None
    output_path: str | None = None


class ExportRecord(BaseModel):
    filename: str
    path: str
    size_bytes: int
    created_at: str | None
    package_label: str | None
    artifact_id: str | None
    source_base_id: str | None
    page_count: int
    active_page_count: int | None
    link_count: int
    attachment_coverage_label: str | None
    compatibility: str
    provenance_summary: str | None


class ExportResult(BaseModel):
    artifact_id: str
    source_base_id: str
    output_path: str
    page_count: int
    link_count: int
    attachment_coverage_label: str = "db_only"


class ArtifactInspection(BaseModel):
    path: str
    artifact_class: str
    compatibility: str
    base_id: str | None
    artifact_id: str | None
    display_name: str | None
    schema_version: int | None
    artifact_schema_family: str | None
    artifact_schema_version: int | None
    created_at: str | None
    package_label: str | None
    page_count: int
    active_page_count: int | None
    link_count: int
    orphan_count: int | None = None
    unembedded_count: int | None = None
    due_for_review_count: int | None = None
    source_base_id: str | None
    provenance_summary: str | None
    attachment_coverage_label: str | None
    valid_actions: list[str]
    errors: list[str]
    summary: str


class ExportRenameRequest(BaseModel):
    filename: str


class ArtifactInspectRequest(BaseModel):
    path: str


class ExportDeletedResponse(BaseModel):
    deleted: bool
    filename: str


class ExportListResponse(BaseModel):
    items: list[ExportRecord]


class ExportResponse(BaseModel):
    item: ExportResult


class ExportRecordResponse(BaseModel):
    item: ExportRecord


class ArtifactInspectResponse(BaseModel):
    item: ArtifactInspection
