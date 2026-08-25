from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class PageType(StrEnum):
    FLEETING = "fleeting"
    NOTE_TAKING = "note-taking"
    PERMANENT = "permanent"
    STRUCTURE = "structure"
    HUB = "hub"


class PageStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    TO_DELETE = "to_delete"


MATURITY_PROMOTIONS: dict[PageType, PageType] = {
    PageType.FLEETING: PageType.NOTE_TAKING,
    PageType.NOTE_TAKING: PageType.PERMANENT,
}


class PageRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    content: str
    type: PageType
    status: PageStatus
    subject: list[str]
    tags: list[str]
    parent_id: str | None
    review_interval_days: int


class PageTitleRef(BaseModel):
    id: str
    title: str


class PageAncestor(BaseModel):
    id: str
    title: str
    parent_id: str | None


class PageConnection(BaseModel):
    id: str
    title: str
    link_type: str
    direction: str


class PageSummary(BaseModel):
    id: str
    title: str
    type: PageType
    status: PageStatus
    subject: list[str]
    tags: list[str]
    parent_id: str | None
    created_at: str
    updated_at: str
    reviewed_at: str | None
    review_interval_days: int
    child_count: int
    active_descendant_count: int


class PageDetail(BaseModel):
    id: str
    title: str
    content: str
    type: PageType
    status: PageStatus
    subject: list[str]
    tags: list[str]
    parent_id: str | None
    content_hash: str | None
    review_interval_days: int
    created_at: str
    updated_at: str
    reviewed_at: str | None
    next_review_at: str | None
    parent: PageTitleRef | None
    sub_items: list[PageTitleRef]
    connected_to: list[PageConnection]
    inline_mentions: list[PageTitleRef]


class PageSearchHit(BaseModel):
    id: str
    title: str
    type: PageType
    status: PageStatus
    snippet: str
    rank: float | None = None


class PageCreate(BaseModel):
    title: str
    content: str = ""
    type: PageType = PageType.FLEETING
    status: PageStatus = PageStatus.ACTIVE
    subject: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    parent_id: str | None = None
    review_interval_days: int = 7


class PageUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    type: PageType | None = None
    status: PageStatus | None = None
    subject: list[str] | None = None
    tags: list[str] | None = None
    parent_id: str | None = None
    review_interval_days: int | None = None

    def apply(self, page: PageRecord) -> PageRecord:
        return page.model_copy(update=self.model_dump(exclude_unset=True))


class PageListResponse(BaseModel):
    items: list[PageSummary]


class PageDetailResponse(BaseModel):
    item: PageDetail


class PageAncestryResponse(BaseModel):
    items: list[PageAncestor]


class PageSearchResponse(BaseModel):
    items: list[PageSearchHit]


class PageDeletedResponse(BaseModel):
    deleted: bool
    id: str


class PageRestoredResponse(BaseModel):
    restored: bool
    id: str
    status: PageStatus


class PagePurgedResponse(BaseModel):
    purged: bool
    id: str


class PageReviewedResponse(BaseModel):
    id: str
    reviewed_at: str


class PagePromotedResponse(BaseModel):
    id: str
    previous_type: PageType
    new_type: PageType
