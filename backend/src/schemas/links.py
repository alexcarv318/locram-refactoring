from enum import StrEnum

from pydantic import BaseModel

from schemas.pages import PageStatus, PageType


class LinkType(StrEnum):
    RELATED = "related"
    EXTENDS = "extends"
    EXTENDED_BY = "extended_by"
    SUPPORTS = "supports"
    SUPPORTED_BY = "supported_by"
    CONTRADICTS = "contradicts"
    CONTRADICTED_BY = "contradicted_by"
    REFINES = "refines"
    REFINED_BY = "refined_by"
    QUESTIONS = "questions"
    QUESTIONED_BY = "questioned_by"
    REFERENCE = "reference"


LINK_INVERSES: dict[LinkType, LinkType] = {
    LinkType.RELATED: LinkType.RELATED,
    LinkType.EXTENDS: LinkType.EXTENDED_BY,
    LinkType.EXTENDED_BY: LinkType.EXTENDS,
    LinkType.SUPPORTS: LinkType.SUPPORTED_BY,
    LinkType.SUPPORTED_BY: LinkType.SUPPORTS,
    LinkType.CONTRADICTS: LinkType.CONTRADICTED_BY,
    LinkType.CONTRADICTED_BY: LinkType.CONTRADICTS,
    LinkType.REFINES: LinkType.REFINED_BY,
    LinkType.REFINED_BY: LinkType.REFINES,
    LinkType.QUESTIONS: LinkType.QUESTIONED_BY,
    LinkType.QUESTIONED_BY: LinkType.QUESTIONS,
}


class GraphScopeKind(StrEnum):
    NEIGHBORHOOD = "neighborhood"
    STRUCTURE_ANCHOR = "structure_anchor"
    HUB_ANCHOR = "hub_anchor"


class LinkCreate(BaseModel):
    source_id: str
    target_id: str
    link_type: LinkType = LinkType.RELATED


class LinkBatchCreate(BaseModel):
    links: list[LinkCreate]


class LinkedPagesResponse(BaseModel):
    source_id: str
    target_id: str
    link_type: LinkType
    created: bool
    already_exists: bool
    created_primary: bool
    created_inverse: bool


class UnlinkedPagesResponse(BaseModel):
    unlinked: bool


class ParentSetResponse(BaseModel):
    child_id: str
    parent_id: str | None


class BatchLinkResult(BaseModel):
    created: int
    skipped: int
    errors: list[str]


class InlineLinkResponse(BaseModel):
    link: str


class PageGraphNode(BaseModel):
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
    snippet: str


class PageGraphLink(BaseModel):
    source: str
    target: str
    type: str


class PageGraph(BaseModel):
    selected_page_id: str
    scope_kind: GraphScopeKind
    nodes: list[PageGraphNode]
    links: list[PageGraphLink]


class PageGraphResponse(BaseModel):
    item: PageGraph
