import type { FilterPreset, GraphFilterOptions, GraphFiltersState, MetadataRuleGroup } from "./contract";
import type { SmartFolderFilterSnapshot } from "./smart-folder";

export type GraphFiltersPresetState = {
  activePresetId: string | null;
  activePresetName: string | null;
  activePresetFilter: GraphFiltersState | null;
};

export type ScopedGraphFilterSnapshot = {
  options: GraphFilterOptions;
  snapshot: SmartFolderFilterSnapshot;
};

export type GraphFiltersScopeState = {
  currentScopeKey: string | null;
  scopedSnapshots: Record<string, ScopedGraphFilterSnapshot>;
};

export type GraphFiltersControllerState = GraphFiltersState &
  GraphFiltersScopeState &
  GraphFiltersPresetState & {
    options: GraphFilterOptions;
  };

export type GraphFiltersStoreActions = {
  setSearchQuery: (value: string) => void;
  setOptions: (options: GraphFilterOptions, preserveState?: boolean) => void;
  resetAllFilters: (optionsOverride?: GraphFilterOptions) => void;
  setLinkTypes: (values: string[], optionsOverride?: GraphFilterOptions) => void;
  setTypes: (values: string[], optionsOverride?: GraphFilterOptions) => void;
  setStatuses: (values: string[], optionsOverride?: GraphFilterOptions) => void;
  setSubjects: (values: string[], optionsOverride?: GraphFilterOptions) => void;
  setTags: (values: string[], optionsOverride?: GraphFilterOptions) => void;
  setCreatedAtFrom: (value: string, optionsOverride?: GraphFilterOptions) => void;
  setCreatedAtTo: (value: string, optionsOverride?: GraphFilterOptions) => void;
  setUpdatedAtFrom: (value: string, optionsOverride?: GraphFilterOptions) => void;
  setUpdatedAtTo: (value: string, optionsOverride?: GraphFilterOptions) => void;
  setReviewedAtFrom: (value: string, optionsOverride?: GraphFilterOptions) => void;
  setReviewedAtTo: (value: string, optionsOverride?: GraphFilterOptions) => void;
  setMetadataRuleGroups: (groups: MetadataRuleGroup[], optionsOverride?: GraphFilterOptions) => void;
  toggleType: (value: string, optionsOverride?: GraphFilterOptions) => void;
  toggleStatus: (value: string, optionsOverride?: GraphFilterOptions) => void;
  toggleSubject: (value: string, optionsOverride?: GraphFilterOptions) => void;
  toggleTag: (value: string, optionsOverride?: GraphFilterOptions) => void;
  toggleLinkType: (value: string, optionsOverride?: GraphFilterOptions) => void;
  getActiveFiltersCount: () => number;
  setActivePreset: (preset: FilterPreset) => void;
  restoreSnapshot: (snapshot: SmartFolderFilterSnapshot) => void;
  setScopeKey: (scopeKey: string | null) => void;
  clearScope: (optionsOverride?: GraphFilterOptions) => void;
};

export type GraphFiltersStoreState = GraphFiltersControllerState & GraphFiltersStoreActions;
