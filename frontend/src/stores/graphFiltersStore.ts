import { create } from "zustand";

import {
  cloneGraphFilters,
  countActiveGraphFilters,
  createDefaultGraphFilters,
  deriveGraphFilterOptions,
  deriveGraphFilterOptionsFromSources,
  EMPTY_GRAPH_FILTERS,
  type FilterPreset,
  type GraphFilterOptions,
  type GraphFiltersState,
  type GraphFiltersStoreState,
  type SmartFolderFilterSnapshot,
  normalizeGraphFilters,
} from "@/lib/graph/filter-state/index";
import type { GraphResponseNode } from "@/types/graph/Graph";

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function materializeLegacySelections(
  state: GraphFiltersStoreState,
  optionsOverride?: GraphFilterOptions,
): GraphFiltersState {
  return normalizeGraphFilters(state, optionsOverride ?? state.options);
}

function optionsFromNodes(nodes: GraphResponseNode[]): GraphFilterOptions {
  return deriveGraphFilterOptionsFromSources(
    nodes.map((node) => ({
      type: node.type,
      status: node.status,
      subject: node.subject,
      tags: node.tags,
    })),
  );
}

function hasPrimaryFilterValues(options: GraphFilterOptions): boolean {
  return (
    options.types.length > 0 ||
    options.statuses.length > 0 ||
    options.subjects.length > 0 ||
    options.tags.length > 0
  );
}

function cloneGraphFilterOptions(options: GraphFilterOptions): GraphFilterOptions {
  return {
    types: [...options.types],
    statuses: [...options.statuses],
    subjects: [...options.subjects],
    tags: [...options.tags],
    linkTypes: [...options.linkTypes],
  };
}

function captureScopedSnapshot(state: GraphFiltersStoreState): {
  options: GraphFilterOptions;
  snapshot: SmartFolderFilterSnapshot;
} {
  return {
    options: cloneGraphFilterOptions(state.options),
    snapshot: {
      filter: cloneGraphFilters({
        selectionEncoding: state.selectionEncoding ?? "legacy-unrestricted-empty",
        searchQuery: state.searchQuery,
        types: [...state.types],
        statuses: [...state.statuses],
        subjects: [...state.subjects],
        tags: [...state.tags],
        metadataRuleGroups: state.metadataRuleGroups.map((group) => ({
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
        linkTypes: [...state.linkTypes],
        createdAt: { ...state.createdAt },
        updatedAt: { ...state.updatedAt },
        reviewedAt: { ...state.reviewedAt },
      }),
      activePresetId: state.activePresetId,
      activePresetName: state.activePresetName,
      activePresetFilter: state.activePresetFilter ? cloneGraphFilters(state.activePresetFilter) : null,
    },
  };
}

export const useGraphFiltersStore = create<GraphFiltersStoreState>((set, get) => ({
  ...EMPTY_GRAPH_FILTERS,
  options: deriveGraphFilterOptions([]),
  activePresetId: null,
  activePresetName: null,
  activePresetFilter: null,
  currentScopeKey: null,
  scopedSnapshots: {},

  setSearchQuery: (value) => set({ searchQuery: value }),

  setOptions: (options, preserveState = false) => {
    const currentState = get();
    if (preserveState) {
      set({ options });
      return;
    }
    if (!hasPrimaryFilterValues(options)) {
      set({
        options,
        selectionEncoding: "legacy-unrestricted-empty",
        searchQuery: "",
        types: [],
        statuses: [],
        subjects: [],
        tags: [],
        metadataRuleGroups: [],
        linkTypes: [...options.linkTypes],
        createdAt: { from: "", to: "" },
        updatedAt: { from: "", to: "" },
        reviewedAt: { from: "", to: "" },
      });
      return;
    }
    const normalized = normalizeGraphFilters(currentState, options);
    const normalizedActivePresetFilter = currentState.activePresetFilter
      ? normalizeGraphFilters(currentState.activePresetFilter, options)
      : null;
    set({
      options,
      ...createDefaultGraphFilters(options),
      ...normalized,
      activePresetFilter: normalizedActivePresetFilter,
    });
  },

  resetAllFilters: (optionsOverride) => {
    const { options, activePresetFilter } = get();
    const resolvedOptions = optionsOverride ?? options;
    if (activePresetFilter) {
      set({ ...normalizeGraphFilters(activePresetFilter, resolvedOptions) });
    } else {
      set(createDefaultGraphFilters(resolvedOptions));
    }
  },

  setMetadataRuleGroups: (metadataRuleGroups, optionsOverride) =>
    set((state) => ({
      ...materializeLegacySelections(state, optionsOverride),
      metadataRuleGroups,
      selectionEncoding: "explicit",
    })),
  setLinkTypes: (values, optionsOverride) =>
    set((state) => ({
      ...materializeLegacySelections(state, optionsOverride),
      linkTypes: values,
      selectionEncoding: "explicit",
    })),
  setTypes: (values, optionsOverride) =>
    set((state) => ({
      ...materializeLegacySelections(state, optionsOverride),
      types: values,
      selectionEncoding: "explicit",
    })),
  setStatuses: (values, optionsOverride) =>
    set((state) => ({
      ...materializeLegacySelections(state, optionsOverride),
      statuses: values,
      selectionEncoding: "explicit",
    })),
  setSubjects: (values, optionsOverride) =>
    set((state) => ({
      ...materializeLegacySelections(state, optionsOverride),
      subjects: values,
      selectionEncoding: "explicit",
    })),
  setTags: (values, optionsOverride) =>
    set((state) => ({
      ...materializeLegacySelections(state, optionsOverride),
      tags: values,
      selectionEncoding: "explicit",
    })),
  setCreatedAtFrom: (value, optionsOverride) =>
    set((state) => {
      const materialized = materializeLegacySelections(state, optionsOverride);
      return { ...materialized, createdAt: { ...materialized.createdAt, from: value }, selectionEncoding: "explicit" };
    }),
  setCreatedAtTo: (value, optionsOverride) =>
    set((state) => {
      const materialized = materializeLegacySelections(state, optionsOverride);
      return { ...materialized, createdAt: { ...materialized.createdAt, to: value }, selectionEncoding: "explicit" };
    }),
  setUpdatedAtFrom: (value, optionsOverride) =>
    set((state) => {
      const materialized = materializeLegacySelections(state, optionsOverride);
      return { ...materialized, updatedAt: { ...materialized.updatedAt, from: value }, selectionEncoding: "explicit" };
    }),
  setUpdatedAtTo: (value, optionsOverride) =>
    set((state) => {
      const materialized = materializeLegacySelections(state, optionsOverride);
      return { ...materialized, updatedAt: { ...materialized.updatedAt, to: value }, selectionEncoding: "explicit" };
    }),
  setReviewedAtFrom: (value, optionsOverride) =>
    set((state) => {
      const materialized = materializeLegacySelections(state, optionsOverride);
      return { ...materialized, reviewedAt: { ...materialized.reviewedAt, from: value }, selectionEncoding: "explicit" };
    }),
  setReviewedAtTo: (value, optionsOverride) =>
    set((state) => {
      const materialized = materializeLegacySelections(state, optionsOverride);
      return { ...materialized, reviewedAt: { ...materialized.reviewedAt, to: value }, selectionEncoding: "explicit" };
    }),
  toggleType: (value, optionsOverride) =>
    set((state) => {
      const materialized = materializeLegacySelections(state, optionsOverride);
      return { ...materialized, types: toggleValue(materialized.types, value), selectionEncoding: "explicit" };
    }),
  toggleStatus: (value, optionsOverride) =>
    set((state) => {
      const materialized = materializeLegacySelections(state, optionsOverride);
      return { ...materialized, statuses: toggleValue(materialized.statuses, value), selectionEncoding: "explicit" };
    }),
  toggleSubject: (value, optionsOverride) =>
    set((state) => {
      const materialized = materializeLegacySelections(state, optionsOverride);
      return { ...materialized, subjects: toggleValue(materialized.subjects, value), selectionEncoding: "explicit" };
    }),
  toggleTag: (value, optionsOverride) =>
    set((state) => {
      const materialized = materializeLegacySelections(state, optionsOverride);
      return { ...materialized, tags: toggleValue(materialized.tags, value), selectionEncoding: "explicit" };
    }),
  toggleLinkType: (value, optionsOverride) =>
    set((state) => {
      const materialized = materializeLegacySelections(state, optionsOverride);
      return { ...materialized, linkTypes: toggleValue(materialized.linkTypes, value), selectionEncoding: "explicit" };
    }),

  getActiveFiltersCount: () => countActiveGraphFilters(get(), get().options),

  setActivePreset: (preset: FilterPreset) => {
    const normalized = cloneGraphFilters({
      ...EMPTY_GRAPH_FILTERS,
      ...preset.filter,
      selectionEncoding: preset.filter.selectionEncoding ?? "legacy-unrestricted-empty",
    });
    set({
      ...normalized,
      activePresetId: preset.id,
      activePresetName: preset.name,
      activePresetFilter: cloneGraphFilters(normalized),
    });
  },

  restoreSnapshot: (snapshot: SmartFolderFilterSnapshot) => {
    set({
      ...snapshot.filter,
      activePresetId: snapshot.activePresetId,
      activePresetName: snapshot.activePresetName,
      activePresetFilter: snapshot.activePresetFilter,
    });
  },

  setScopeKey: (scopeKey) => {
    const currentState = get();
    if (currentState.currentScopeKey === scopeKey) {
      return;
    }

    const nextScopedSnapshots = { ...currentState.scopedSnapshots };
    if (currentState.currentScopeKey) {
      nextScopedSnapshots[currentState.currentScopeKey] = captureScopedSnapshot(currentState);
    }

    const nextSnapshot = scopeKey ? nextScopedSnapshots[scopeKey] : null;
    if (nextSnapshot) {
      set({
        currentScopeKey: scopeKey,
        scopedSnapshots: nextScopedSnapshots,
        options: cloneGraphFilterOptions(nextSnapshot.options),
        ...cloneGraphFilters(nextSnapshot.snapshot.filter),
        activePresetId: nextSnapshot.snapshot.activePresetId,
        activePresetName: nextSnapshot.snapshot.activePresetName,
        activePresetFilter: nextSnapshot.snapshot.activePresetFilter
          ? cloneGraphFilters(nextSnapshot.snapshot.activePresetFilter)
          : null,
      });
      return;
    }

    set({
      currentScopeKey: scopeKey,
      scopedSnapshots: nextScopedSnapshots,
      ...EMPTY_GRAPH_FILTERS,
      options: deriveGraphFilterOptions([]),
      activePresetId: null,
      activePresetName: null,
      activePresetFilter: null,
    });
  },

  clearScope: (optionsOverride) => {
    const { options } = get();
    const resolvedOptions = optionsOverride ?? options;
    set({
      ...createDefaultGraphFilters(resolvedOptions),
      activePresetId: null,
      activePresetName: null,
      activePresetFilter: null,
    });
  },
}));

export function setOptionsFromNodes(nodes: GraphResponseNode[], preserveState = false): void {
  useGraphFiltersStore.getState().setOptions(optionsFromNodes(nodes), preserveState);
}
