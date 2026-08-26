from enum import StrEnum

from pydantic import BaseModel


class PageChangeKind(StrEnum):
    METADATA = "metadata"
    CONTENT = "content"
    TOPOLOGY = "topology"


class PageDataChange(BaseModel):
    version: int
    entity_kind: str = "page"
    operation: str
    occurred_at: str
    page_id: str
    change_kind: PageChangeKind | None = None
    base_ref: str | None = None
    entry_id: str | None = None


class LinkDataChange(BaseModel):
    version: int
    entity_kind: str = "link"
    operation: str
    occurred_at: str
    source_id: str | None = None
    target_id: str | None = None
    link_type: str | None = None
    entity_id: str | None = None
    base_ref: str | None = None
    entry_id: str | None = None


DataChange = PageDataChange | LinkDataChange


class DataVersion(BaseModel):
    version: int
    updated_at: str
    changes: list[DataChange] | None = None


class DataVersionResponse(BaseModel):
    item: DataVersion
