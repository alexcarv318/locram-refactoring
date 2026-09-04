import { cloneGraphFilters } from "./contract";
import type { GraphFilterOptions, GraphFiltersState } from "./contract";
import { isSelectionNarrowed, normalizeGraphFilters } from "./options";
import type { GraphFiltersStoreState } from "./store-contract";

export type SmartFolderFilterSnapshot = {
  filter: GraphFiltersState;
  activePresetId: string | null;
  activePresetName: string | null;
  activePresetFilter: GraphFiltersState | null;
};

function persistSelection(selectedValues: string[], availableValues: string[]) {
  return isSelectionNarrowed(selectedValues, availableValues) ? [...selectedValues] : [];
}

export function buildCurrentSmartFolderFilter(
  state: Pick<
    GraphFiltersStoreState,
    | "createdAt"
    | "linkTypes"
    | "metadataRuleGroups"
    | "options"
    | "reviewedAt"
    | "searchQuery"
    | "selectionEncoding"
    | "statuses"
    | "subjects"
    | "tags"
    | "types"
    | "updatedAt"
  >,
  optionsOverride?: GraphFilterOptions,
): GraphFiltersState {
  const options = optionsOverride ?? state.options;
  const normalized = normalizeGraphFilters(state, options);

  return {
    selectionEncoding: "explicit",
    searchQuery: normalized.searchQuery,
    types: persistSelection(normalized.types, options.types),
    statuses: persistSelection(normalized.statuses, options.statuses),
    subjects: persistSelection(normalized.subjects, options.subjects),
    tags: persistSelection(normalized.tags, options.tags),
    metadataRuleGroups: normalized.metadataRuleGroups.map((group) => ({
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
    linkTypes: persistSelection(normalized.linkTypes, options.linkTypes),
    createdAt: { ...normalized.createdAt },
    updatedAt: { ...normalized.updatedAt },
    reviewedAt: { ...normalized.reviewedAt },
  };
}

export function captureSmartFolderSnapshot(
  state: Pick<
    GraphFiltersStoreState,
    | "activePresetFilter"
    | "activePresetId"
    | "activePresetName"
    | "createdAt"
    | "linkTypes"
    | "metadataRuleGroups"
    | "reviewedAt"
    | "searchQuery"
    | "selectionEncoding"
    | "statuses"
    | "subjects"
    | "tags"
    | "types"
    | "updatedAt"
  >,
): SmartFolderFilterSnapshot {
  return {
    filter: {
      selectionEncoding: state.selectionEncoding ?? "explicit",
      searchQuery: state.searchQuery,
      types: [...state.types],
      statuses: [...state.statuses],
      subjects: [...state.subjects],
      tags: [...state.tags],
      metadataRuleGroups: state.metadataRuleGroups.map((group) => ({
        id: group.id,
        joiner: group.joiner,
        rules: group.rules.map((rule) => ({
          id: rule.id,
          field: rule.field,
          operator: rule.operator,
          values: [...rule.values],
        })),
      })),
      linkTypes: [...state.linkTypes],
      createdAt: { ...state.createdAt },
      updatedAt: { ...state.updatedAt },
      reviewedAt: { ...state.reviewedAt },
    },
    activePresetId: state.activePresetId,
    activePresetName: state.activePresetName,
    activePresetFilter: state.activePresetFilter ? cloneGraphFilters(state.activePresetFilter) : null,
  };
}
