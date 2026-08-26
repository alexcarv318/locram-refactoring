from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from schemas.links import PageGraphLink, PageGraphNode
from schemas.pages import PageSummary


class SelectionEncoding(StrEnum):
    EXPLICIT = "explicit"
    LEGACY_UNRESTRICTED_EMPTY = "legacy-unrestricted-empty"


class PageIdMode(StrEnum):
    AND = "and"
    OR = "or"
    NOT = "not"


class MetadataRuleField(StrEnum):
    TITLE = "title"
    SUBJECT = "subject"
    TAG = "tag"


class MetadataRuleOperator(StrEnum):
    CONTAINS = "contains"
    DOES_NOT_CONTAIN = "does_not_contain"
    HAS_ANY_OF = "has_any_of"
    HAS_ALL_OF = "has_all_of"
    HAS_NONE_OF = "has_none_of"


class RuleJoiner(StrEnum):
    AND = "and"
    OR = "or"


class DateRange(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    range_from: str = Field(default="", alias="from")
    range_to: str = Field(default="", alias="to")


class MetadataRule(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str = ""
    field: MetadataRuleField = MetadataRuleField.TITLE
    operator: MetadataRuleOperator = MetadataRuleOperator.HAS_ANY_OF
    values: list[str] = Field(default_factory=list)


class MetadataRuleGroup(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str = ""
    joiner: RuleJoiner = RuleJoiner.AND
    negated: bool = False
    rules: list[MetadataRule] = Field(default_factory=list)


class FilterState(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True, extra="ignore")

    selection_encoding: SelectionEncoding = Field(
        default=SelectionEncoding.LEGACY_UNRESTRICTED_EMPTY,
        alias="selectionEncoding",
    )
    search_query: str = Field(default="", alias="searchQuery")
    types: list[str] = Field(default_factory=list)
    statuses: list[str] = Field(default_factory=list)
    subjects: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    metadata_rule_groups: list[MetadataRuleGroup] = Field(
        default_factory=list,
        alias="metadataRuleGroups",
    )
    link_types: list[str] = Field(default_factory=list, alias="linkTypes")
    created_at: DateRange | None = Field(default=None, alias="createdAt")
    updated_at: DateRange | None = Field(default=None, alias="updatedAt")
    reviewed_at: DateRange | None = Field(default=None, alias="reviewedAt")
    page_ids: list[str] = Field(default_factory=list, alias="pageIds")
    page_id_mode: PageIdMode = Field(default=PageIdMode.OR, alias="pageIdMode")


class FilterPresetRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str
    name: str
    filter: FilterState
    created_at: str
    updated_at: str


class FilterPresetFile(BaseModel):
    presets: list[FilterPresetRecord] = Field(default_factory=list)


class FilterPresetCreate(BaseModel):
    name: str
    filter: FilterState


class FilterPresetUpdate(BaseModel):
    name: str | None = None
    filter: FilterState | None = None


class FilterPresetResponse(BaseModel):
    item: FilterPresetRecord


class FilterPresetListResponse(BaseModel):
    items: list[FilterPresetRecord]


class FilterPresetDeletedResponse(BaseModel):
    deleted: bool
    id: str


class SmartFolderGraphNode(PageGraphNode):
    scope_origin: str


class SmartFolderGraph(BaseModel):
    scope_id: str
    scope_kind: str
    preset_id: str | None
    nodes: list[SmartFolderGraphNode]
    links: list[PageGraphLink]


class SmartFolderGraphResponse(BaseModel):
    item: SmartFolderGraph


class NotesSummariesResponse(BaseModel):
    items: list[PageSummary]
    built_in_counts: dict[str, int]
    preset_counts: dict[str, int]
    quick_access_scope_ids: list[str]


BUILT_IN_SCOPE_IDS = (
    "builtin-folder-created-today",
    "builtin-folder-created-week",
    "builtin-folder-created-month",
    "builtin-folder-modified-today",
    "builtin-folder-modified-week",
    "builtin-folder-modified-month",
    "builtin-folder-need-review",
    "builtin-folder-orphaned",
)

CREATED_TODAY_SCOPE_ID = BUILT_IN_SCOPE_IDS[0]
CREATED_WEEK_SCOPE_ID = BUILT_IN_SCOPE_IDS[1]
CREATED_MONTH_SCOPE_ID = BUILT_IN_SCOPE_IDS[2]
MODIFIED_TODAY_SCOPE_ID = BUILT_IN_SCOPE_IDS[3]
MODIFIED_WEEK_SCOPE_ID = BUILT_IN_SCOPE_IDS[4]
MODIFIED_MONTH_SCOPE_ID = BUILT_IN_SCOPE_IDS[5]
NEED_REVIEW_SCOPE_ID = BUILT_IN_SCOPE_IDS[6]
ORPHANED_SCOPE_ID = BUILT_IN_SCOPE_IDS[7]
