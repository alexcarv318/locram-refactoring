from pydantic import BaseModel


class MergePage(BaseModel):
    id: str
    title: str
    content: str
    type: str
    status: str
    subject: list[str]
    tags: list[str]
    parent_id: str | None
    content_hash: str | None
    review_interval_days: int
    created_at: str
    updated_at: str
    reviewed_at: str | None


class MergeLink(BaseModel):
    source_id: str
    target_id: str
    link_type: str
    created_at: str


class MergeSource(BaseModel):
    path: str
    artifact_id: str | None
    source_base_id: str | None
    pages: list[MergePage]
    links: list[MergeLink]


class MergeDuplicateCandidate(BaseModel):
    source_page_id: str
    source_title: str
    target_page_id: str
    target_title: str
    reason: str


class MergeConflict(BaseModel):
    page_id: str
    title: str
    reason: str


class MergePlan(BaseModel):
    source_path: str
    source_artifact_id: str | None
    source_base_id: str | None
    target_base_id: str
    target_display_name: str
    incoming_page_count: int
    incoming_link_count: int
    new_page_count: int
    new_link_count: int
    already_present_count: int
    duplicate_candidate_count: int
    blocked_conflict_count: int
    provenance_coverage_summary: str
    duplicate_candidates: list[MergeDuplicateCandidate]
    blocked_conflicts: list[MergeConflict]


class MergeOutcome(BaseModel):
    merge_operation_id: str
    backup_filename: str
    inserted_page_count: int
    inserted_link_count: int
    already_present_count: int
    duplicate_candidate_warning_count: int
    blocked_conflict_count: int


class MergeRequest(BaseModel):
    path: str


class MergePlanResponse(BaseModel):
    item: MergePlan


class MergeOutcomeResponse(BaseModel):
    item: MergeOutcome
