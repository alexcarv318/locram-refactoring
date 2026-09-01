import { cloneGraphFilters } from "./contract";
import type { GraphFiltersState } from "./contract";
import type { GraphFiltersStoreState } from "./store-contract";

export type SmartFolderFilterSnapshot = {
  filter: GraphFiltersState;
  activePresetId: string | null;
  activePresetName: string | null;
  activePresetFilter: GraphFiltersState | null;
};

export function buildCurrentSmartFolderFilter(
  state: Pick<
    GraphFiltersStoreState,
    | "createdAt"
    | "linkTypes"
    | "metadataRuleGroups"
    | "reviewedAt"
    | "selectionEncoding"
    | "statuses"
    | "subjects"
    | "tags"
    | "types"
    | "updatedAt"
  >,
): GraphFiltersState {
  return {
    selectionEncoding: state.selectionEncoding ?? "legacy-unrestricted-empty",
    searchQuery: "",
    types: [...state.types],
    statuses: [...state.statuses],
    subjects: [...state.subjects],
    tags: [...state.tags],
    metadataRuleGroups: state.metadataRuleGroups.map((group) => ({
      id: group.id,
      joiner: group.joiner,
      negated: group.negated,
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
