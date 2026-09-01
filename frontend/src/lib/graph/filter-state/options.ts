import { LOCRAM_GRAPH_LINK_FILTER_ORDER } from "@/lib/graph/link-types";
import {
  createDefaultGraphFilters,
  PAGE_STATUS_ORDER,
  PAGE_TYPE_ORDER,
  type GraphDateRange,
  type GraphFilterOptions,
  type GraphFiltersState,
  type MetadataRuleGroup,
} from "./contract";
import { getActiveMetadataRules } from "./metadata";

type FilterMetadataSource = {
  status: string;
  subject: string[];
  tags: string[];
  type: string;
};

type GraphFilterNormalizationInput = Partial<GraphFiltersState> & {
  options?: GraphFilterOptions;
};
type GraphFilterCountingInput = GraphFiltersState & {
  options?: GraphFilterOptions;
};

const LEGACY_METADATA_RULE_GROUP_IDS = new Set(["legacy-subject-group", "legacy-tag-group"]);

function sortByKnownOrder(values: string[], orderedValues: string[]) {
  return [...values].sort((left, right) => orderedValues.indexOf(left) - orderedValues.indexOf(right));
}

export function isSelectionNarrowed(selectedValues: string[], availableValues: string[]) {
  if (availableValues.length === 0) {
    return false;
  }

  if (selectedValues.length !== availableValues.length) {
    return true;
  }

  const selectedSet = new Set(selectedValues);
  return availableValues.some((value) => !selectedSet.has(value));
}

function normalizeExplicitSelection(
  selectedValues: string[] | undefined,
  availableValues: string[],
  previousAvailableValues?: string[],
) {
  if (availableValues.length === 0) {
    return [];
  }

  if (!selectedValues) {
    return [...availableValues];
  }

  const selectedSet = new Set(selectedValues);
  if (previousAvailableValues && previousAvailableValues.length > 0) {
    const coveredPreviousScope = previousAvailableValues.every((value) => selectedSet.has(value));
    if (coveredPreviousScope) {
      return [...availableValues];
    }
  }

  return availableValues.filter((value) => selectedSet.has(value));
}

function hasDateRangeValue(range: GraphDateRange) {
  return Boolean(range.from || range.to);
}

export function deriveGraphFilterOptionsFromSources(sources: FilterMetadataSource[]): GraphFilterOptions {
  const types = new Set<string>();
  const statuses = new Set<string>();
  const subjects = new Set<string>();
  const tags = new Set<string>();

  sources.forEach((source) => {
    types.add(source.type);
    statuses.add(source.status);
    source.subject.forEach((value) => subjects.add(value));
    source.tags.forEach((value) => tags.add(value));
  });

  return {
    types: sortByKnownOrder(Array.from(types), PAGE_TYPE_ORDER),
    statuses: sortByKnownOrder(Array.from(statuses), PAGE_STATUS_ORDER),
    subjects: Array.from(subjects).sort((left, right) => left.localeCompare(right)),
    tags: Array.from(tags).sort((left, right) => left.localeCompare(right)),
    linkTypes: [...LOCRAM_GRAPH_LINK_FILTER_ORDER],
  };
}

export function deriveGraphFilterOptions(nodes: FilterMetadataSource[]): GraphFilterOptions {
  return deriveGraphFilterOptionsFromSources(nodes);
}

export function normalizeGraphFilters(filters: Partial<GraphFiltersState>, options: GraphFilterOptions): GraphFiltersState {
  const previousOptions = (filters as GraphFilterNormalizationInput).options;
  const base = createDefaultGraphFilters(options);
  const sanitizedMetadataRuleGroups = (filters.metadataRuleGroups ?? []).filter(
    (group) => !LEGACY_METADATA_RULE_GROUP_IDS.has(group.id),
  );
  const selectionEncoding = filters.selectionEncoding ?? "legacy-unrestricted-empty";
  const legacyEmptyTypes = selectionEncoding === "legacy-unrestricted-empty" && (filters.types ?? null)?.length === 0;
  const legacyEmptyStatuses = selectionEncoding === "legacy-unrestricted-empty" && (filters.statuses ?? null)?.length === 0;
  const legacyEmptySubjects = selectionEncoding === "legacy-unrestricted-empty" && (filters.subjects ?? null)?.length === 0;
  const legacyEmptyTags = selectionEncoding === "legacy-unrestricted-empty" && (filters.tags ?? null)?.length === 0;
  const unresolvedLegacyTypes = legacyEmptyTypes && options.types.length === 0;
  const unresolvedLegacyStatuses = legacyEmptyStatuses && options.statuses.length === 0;
  const unresolvedLegacySubjects = legacyEmptySubjects && options.subjects.length === 0;
  const unresolvedLegacyTags = legacyEmptyTags && options.tags.length === 0;
  const normalizedTypes = legacyEmptyTypes
    ? (unresolvedLegacyTypes ? [] : base.types)
    : normalizeExplicitSelection(filters.types, options.types, previousOptions?.types);
  const normalizedStatuses = legacyEmptyStatuses
    ? (unresolvedLegacyStatuses ? [] : base.statuses)
    : normalizeExplicitSelection(filters.statuses, options.statuses, previousOptions?.statuses);
  const normalizedSubjects = legacyEmptySubjects
    ? (unresolvedLegacySubjects ? [] : base.subjects)
    : normalizeExplicitSelection(filters.subjects, options.subjects, previousOptions?.subjects);
  const normalizedTags = legacyEmptyTags
    ? (unresolvedLegacyTags ? [] : base.tags)
    : normalizeExplicitSelection(filters.tags, options.tags, previousOptions?.tags);
  const normalizedSelectionEncoding =
    unresolvedLegacyTypes || unresolvedLegacyStatuses || unresolvedLegacySubjects || unresolvedLegacyTags
    ? "legacy-unrestricted-empty"
    : "explicit";

  return {
    selectionEncoding: normalizedSelectionEncoding,
    searchQuery: filters.searchQuery ?? base.searchQuery,
    types: normalizedTypes,
    statuses: normalizedStatuses,
    subjects: normalizedSubjects,
    tags: normalizedTags,
    metadataRuleGroups: sanitizedMetadataRuleGroups.map((group) => ({
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
    linkTypes: normalizeExplicitSelection(filters.linkTypes, options.linkTypes, previousOptions?.linkTypes),
    createdAt: { ...base.createdAt, ...(filters.createdAt ?? {}) },
    updatedAt: { ...base.updatedAt, ...(filters.updatedAt ?? {}) },
    reviewedAt: { ...base.reviewedAt, ...(filters.reviewedAt ?? {}) },
  };
}

export function countActiveGraphFilters(filters: GraphFilterCountingInput, options: GraphFilterOptions) {
  const normalizedFilters = normalizeGraphFilters(filters, options);
  const metadataRuleGroups = filters.metadataRuleGroups ?? [];
  let count = 0;

  if (normalizedFilters.searchQuery.trim()) {
    count += 1;
  }

  if (isSelectionNarrowed(normalizedFilters.types, options.types)) {
    count += 1;
  }

  if (isSelectionNarrowed(normalizedFilters.statuses, options.statuses)) {
    count += 1;
  }

  if (isSelectionNarrowed(normalizedFilters.subjects, options.subjects)) {
    count += 1;
  }

  if (isSelectionNarrowed(normalizedFilters.tags, options.tags)) {
    count += 1;
  }

  count += metadataRuleGroups.filter((group: MetadataRuleGroup) => getActiveMetadataRules(group, options).length > 0).length;

  if (isSelectionNarrowed(normalizedFilters.linkTypes, options.linkTypes)) {
    count += 1;
  }

  if (hasDateRangeValue(normalizedFilters.createdAt)) {
    count += 1;
  }

  if (hasDateRangeValue(normalizedFilters.updatedAt)) {
    count += 1;
  }

  if (hasDateRangeValue(normalizedFilters.reviewedAt)) {
    count += 1;
  }

  return count;
}
