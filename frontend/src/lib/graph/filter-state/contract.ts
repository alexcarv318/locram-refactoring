import { LOCRAM_GRAPH_LINK_FILTER_ORDER } from "@/lib/graph/link-types";

export type GraphFilterOptions = {
  types: string[];
  statuses: string[];
  subjects: string[];
  tags: string[];
  linkTypes: string[];
};

export type GraphDateRange = {
  from: string;
  to: string;
};

export type MetadataRuleField = "title" | "subject" | "tag";
export type MetadataRuleOperator =
  | "contains"
  | "does_not_contain"
  | "has_any_of"
  | "has_all_of"
  | "has_none_of";

export type MetadataRule = {
  field: MetadataRuleField;
  id: string;
  operator: MetadataRuleOperator;
  values: string[];
};

export type MetadataRuleGroup = {
  id: string;
  joiner: "and" | "or";
  negated?: boolean;
  rules: MetadataRule[];
};

export type GraphFiltersState = {
  selectionEncoding?: "explicit" | "legacy-unrestricted-empty";
  searchQuery: string;
  types: string[];
  statuses: string[];
  subjects: string[];
  tags: string[];
  metadataRuleGroups: MetadataRuleGroup[];
  linkTypes: string[];
  createdAt: GraphDateRange;
  updatedAt: GraphDateRange;
  reviewedAt: GraphDateRange;
};

export const EMPTY_GRAPH_FILTER_OPTIONS: GraphFilterOptions = {
  types: [],
  statuses: [],
  subjects: [],
  tags: [],
  linkTypes: [...LOCRAM_GRAPH_LINK_FILTER_ORDER],
};

export const EMPTY_GRAPH_FILTERS: GraphFiltersState = {
  selectionEncoding: "legacy-unrestricted-empty",
  searchQuery: "",
  types: [],
  statuses: [],
  subjects: [],
  tags: [],
  metadataRuleGroups: [],
  linkTypes: [...LOCRAM_GRAPH_LINK_FILTER_ORDER],
  createdAt: { from: "", to: "" },
  updatedAt: { from: "", to: "" },
  reviewedAt: { from: "", to: "" },
};

export const PAGE_TYPE_ORDER = ["fleeting", "note-taking", "permanent", "structure", "hub"];
export const PAGE_STATUS_ORDER = ["active", "archived", "to_delete"];

export type FilterPreset = {
  id: string;
  name: string;
  filter: GraphFiltersState;
  created_at: string;
  updated_at: string;
};

export function createDefaultGraphFilters(options: GraphFilterOptions): GraphFiltersState {
  return {
    selectionEncoding: "explicit",
    searchQuery: "",
    types: [...options.types],
    statuses: [...options.statuses],
    subjects: [...options.subjects],
    tags: [...options.tags],
    metadataRuleGroups: [],
    linkTypes: [...options.linkTypes],
    createdAt: { from: "", to: "" },
    updatedAt: { from: "", to: "" },
    reviewedAt: { from: "", to: "" },
  };
}

export function cloneGraphFilters(filters: GraphFiltersState): GraphFiltersState {
  return {
    selectionEncoding: filters.selectionEncoding ?? "explicit",
    searchQuery: filters.searchQuery,
    types: [...filters.types],
    statuses: [...filters.statuses],
    subjects: [...filters.subjects],
    tags: [...filters.tags],
    metadataRuleGroups: filters.metadataRuleGroups.map((group) => ({
      id: group.id,
      joiner: group.joiner,
      negated: Boolean(group.negated),
      rules: group.rules.map((rule) => ({
        id: rule.id,
        field: rule.field,
        operator: rule.operator,
        values: [...rule.values],
      })),
    })),
    linkTypes: [...filters.linkTypes],
    createdAt: { ...filters.createdAt },
    updatedAt: { ...filters.updatedAt },
    reviewedAt: { ...filters.reviewedAt },
  };
}
