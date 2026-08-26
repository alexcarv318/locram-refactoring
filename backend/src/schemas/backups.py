from pydantic import BaseModel


class BackupRecord(BaseModel):
    filename: str
    path: str
    size_bytes: int
    created_at: str
    trigger: str
    base_id: str | None = None
    source_base_id: str | None = None
    display_name: str | None = None
    page_count: int | None = None
    active_page_count: int | None = None
    link_count: int | None = None
    artifact_class: str = "snapshot"


class BackupCreateRequest(BaseModel):
    trigger: str = "manual"


class BackupRenameRequest(BaseModel):
    filename: str


class BackupRestoreRequest(BaseModel):
    filename: str | None = None
    path: str | None = None
    allow_base_replacement: bool = False


class RestoreResult(BaseModel):
    restored_from: str
    restored_from_path: str | None
    pre_restore_backup: str | None


class BackupDeletedResponse(BaseModel):
    deleted: bool
    filename: str


class BackupListResponse(BaseModel):
    items: list[BackupRecord]


class BackupResponse(BaseModel):
    item: BackupRecord


class RestoreResponse(BaseModel):
    item: RestoreResult
