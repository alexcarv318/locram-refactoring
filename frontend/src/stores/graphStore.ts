import { create } from "zustand";

import type { PageOpenDisposition } from "@/lib/pageOpenTabs";
import { reuseGraphData } from "@/lib/graph/reuse";
import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";

export interface GraphDataState {
  nodes: GraphResponseNode[];
  links: GraphResponseLink[];
}

export const EMPTY_GRAPH_DATA: GraphDataState = {
  nodes: [],
  links: [],
};

export type GraphScope =
  | { kind: "page" | "notes"; id: string }
  | { kind: "source"; id: string; sourceId: string }
  | { kind: "smart-folder"; id: string; presetId: string }
  | null;

export type GraphCacheScopeKind = NonNullable<GraphScope>["kind"];

function normalizeGraphData(
  data: GraphDataState | null | undefined,
): GraphDataState {
  return {
    nodes: Array.isArray(data?.nodes) ? data.nodes : [],
    links: Array.isArray(data?.links) ? data.links : [],
  };
}

export function getGraphScopeCacheKey(
  scope: GraphScope,
  options?: { graphDepth?: number },
) {
  if (!scope) {
    return null;
  }

  const graphDepth = options?.graphDepth;
  const depthPart = graphDepth === undefined ? "" : `:depth=${graphDepth}`;

  switch (scope.kind) {
    case "page":
      return `page:${scope.id}${depthPart}`;
    case "notes":
      return `notes:${scope.id}${depthPart}`;
    case "smart-folder":
      return `smart-folder:${scope.presetId}${depthPart}`;
    case "source":
      return `source:${scope.sourceId}${depthPart}`;
    default:
      return null;
  }
}

interface GraphState {
  graphData: GraphDataState;
  fetchedGraphData: GraphDataState;
  graphCache: Record<string, GraphDataState>;
  sharedBasePartialLoadNoticeByScopeKey: Record<string, string>;
  staleGraphCacheKeys: Set<string>;
  setGraphData: (data: GraphDataState) => void;
  replaceGraphData: (data: GraphDataState) => void;
  setFetchedGraphData: (data: GraphDataState) => void;
  cacheGraphData: (scopeKey: string, data: GraphDataState) => void;
  getCachedGraphData: (scopeKey: string) => GraphDataState | null;
  cacheSharedBasePartialLoadNotice: (scopeKey: string, message: string) => void;
  getSharedBasePartialLoadNotice: (scopeKey: string) => string | null;
  clearSharedBasePartialLoadNotice: (scopeKey: string) => void;
  isCachedGraphStale: (scopeKey: string) => boolean;
  markCachedGraphsStaleByPrefix: (prefix: string) => boolean;

  pendingGraphData: GraphDataState | null;
  setPendingGraphData: (data: GraphDataState | null) => void;
  clearPendingGraphData: () => void;

  selectedNodeIds: Set<string>;
  lastSelectedNodeId: string | null;

  focusedNodeId: string | null;
  focusNode: (nodeId: string | null) => void;

  requestedPageSelectionId: string | null;
  requestedPageOpenDisposition: PageOpenDisposition;
  requestPageSelection: (pageId: string | null, disposition?: PageOpenDisposition) => void;
  clearRequestedPageSelection: () => void;

  graphScope: GraphScope;
  setGraphScope: (scope: GraphScope) => void;
  graphPresentationEpoch: number;
  bumpGraphPresentationEpoch: () => void;

  graphMode: "synced" | "frozen";
  setGraphMode: (mode: "synced" | "frozen") => void;

  graphStale: boolean;
  markGraphStale: () => void;
  clearGraphStale: () => void;

  refreshGraphRequestId: number;
  requestGraphRefresh: () => void;

  rebuildGraphFromSelectionRequestId: number;
  requestGraphRebuildFromSelection: () => void;

  clearSelectedNodes: () => void;
  patchGraphsContainingNode: (
    nodeId: string,
    updateNode: (node: GraphResponseNode) => GraphResponseNode,
    options?: { scopeKinds?: GraphCacheScopeKind[] },
  ) => boolean;
  invalidateCachedGraphsContainingNode: (
    nodeId: string,
    options?: { scopeKinds?: GraphCacheScopeKind[] },
  ) => boolean;
  setSelectedNodeIds: (nodeIds: Iterable<string>) => void;
  selectSingleNode: (nodeId: string) => void;
  toggleNodeSelection: (nodeId: string) => void;
  resetGraphState: () => void;
}

function graphContainsNode(
  data: GraphDataState | null | undefined,
  nodeId: string,
) {
  return normalizeGraphData(data).nodes.some(
    (node) => String(node.id) === nodeId,
  );
}

function patchGraphDataNode(
  data: GraphDataState | null | undefined,
  nodeId: string,
  updateNode: (node: GraphResponseNode) => GraphResponseNode,
) {
  const normalizedData = normalizeGraphData(data);
  let changed = false;
  const nodes = normalizedData.nodes.map((node) => {
    if (String(node.id) !== nodeId) {
      return node;
    }
    changed = true;
    return updateNode(node);
  });
  if (!changed) {
    return null;
  }
  return { nodes, links: normalizedData.links };
}

function scopeKeyMatchesKind(scopeKey: string, kind: GraphCacheScopeKind) {
  return (
    scopeKey === kind ||
    scopeKey.startsWith(`${kind}:`) ||
    scopeKey.includes(`:${kind}:`)
  );
}

function matchesScopeKinds(
  scopeKey: string,
  scopeKinds?: GraphCacheScopeKind[],
) {
  if (!scopeKinds || scopeKinds.length === 0) {
    return true;
  }
  return scopeKinds.some((kind) => scopeKeyMatchesKind(scopeKey, kind));
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graphData: EMPTY_GRAPH_DATA,
  fetchedGraphData: EMPTY_GRAPH_DATA,
  graphCache: {},
  sharedBasePartialLoadNoticeByScopeKey: {},
  staleGraphCacheKeys: new Set(),
  setGraphData: (data) =>
    set((state) => ({
      graphData: reuseGraphData(
        normalizeGraphData(state.graphData),
        normalizeGraphData(data),
      ),
    })),
  replaceGraphData: (data) =>
    set({
      graphData: normalizeGraphData(data),
    }),
  setFetchedGraphData: (data) => {
    set((state) => ({
      fetchedGraphData: reuseGraphData(
        normalizeGraphData(state.fetchedGraphData),
        normalizeGraphData(data),
      ),
    }));
  },
  cacheGraphData: (scopeKey, data) =>
    set((state) => ({
      graphCache: {
        ...state.graphCache,
        [scopeKey]: reuseGraphData(
          normalizeGraphData(state.graphCache[scopeKey]),
          normalizeGraphData(data),
        ),
      },
      staleGraphCacheKeys: new Set(
        [...state.staleGraphCacheKeys].filter(
          (staleScopeKey) => staleScopeKey !== scopeKey,
        ),
      ),
    })),
  getCachedGraphData: (scopeKey) => get().graphCache[scopeKey] ?? null,
  cacheSharedBasePartialLoadNotice: (scopeKey, message) =>
    set((state) => ({
      sharedBasePartialLoadNoticeByScopeKey: {
        ...state.sharedBasePartialLoadNoticeByScopeKey,
        [scopeKey]: message,
      },
    })),
  getSharedBasePartialLoadNotice: (scopeKey) =>
    get().sharedBasePartialLoadNoticeByScopeKey[scopeKey] ?? null,
  clearSharedBasePartialLoadNotice: (scopeKey) =>
    set((state) => {
      if (!(scopeKey in state.sharedBasePartialLoadNoticeByScopeKey)) {
        return state;
      }
      const nextNotices = { ...state.sharedBasePartialLoadNoticeByScopeKey };
      delete nextNotices[scopeKey];
      return { sharedBasePartialLoadNoticeByScopeKey: nextNotices };
    }),
  isCachedGraphStale: (scopeKey) => get().staleGraphCacheKeys.has(scopeKey),
  markCachedGraphsStaleByPrefix: (prefix) => {
    let changed = false;

    set((state) => {
      const nextStaleGraphCacheKeys = new Set(state.staleGraphCacheKeys);
      for (const scopeKey of Object.keys(state.graphCache)) {
        if (
          !scopeKey.startsWith(prefix) ||
          nextStaleGraphCacheKeys.has(scopeKey)
        ) {
          continue;
        }
        nextStaleGraphCacheKeys.add(scopeKey);
        changed = true;
      }

      if (!changed) {
        return state;
      }

      return {
        staleGraphCacheKeys: nextStaleGraphCacheKeys,
      };
    });

    return changed;
  },

  pendingGraphData: null,
  setPendingGraphData: (data) => set({ pendingGraphData: data }),
  clearPendingGraphData: () => set({ pendingGraphData: null }),

  selectedNodeIds: new Set(),
  lastSelectedNodeId: null,

  focusedNodeId: null,
  focusNode: (nodeId) => set({ focusedNodeId: nodeId }),

  requestedPageSelectionId: null,
  requestedPageOpenDisposition: "default",
  requestPageSelection: (pageId, disposition = "default") =>
    set({
      requestedPageSelectionId: pageId,
      requestedPageOpenDisposition: disposition,
    }),
  clearRequestedPageSelection: () =>
    set({
      requestedPageSelectionId: null,
      requestedPageOpenDisposition: "default",
    }),

  graphScope: null,
  setGraphScope: (scope) => set({ graphScope: scope }),
  graphPresentationEpoch: 0,
  bumpGraphPresentationEpoch: () =>
    set((state) => ({
      graphPresentationEpoch: state.graphPresentationEpoch + 1,
    })),

  graphMode: "synced",
  setGraphMode: (mode) => set({ graphMode: mode }),

  graphStale: false,
  markGraphStale: () => set({ graphStale: true }),
  clearGraphStale: () => set({ graphStale: false }),

  refreshGraphRequestId: 0,
  requestGraphRefresh: () =>
    set((state) => ({
      refreshGraphRequestId: state.refreshGraphRequestId + 1,
    })),

  rebuildGraphFromSelectionRequestId: 0,
  requestGraphRebuildFromSelection: () =>
    set((state) => ({
      rebuildGraphFromSelectionRequestId:
        state.rebuildGraphFromSelectionRequestId + 1,
    })),

  clearSelectedNodes: () =>
    set({
      selectedNodeIds: new Set(),
      lastSelectedNodeId: null,
      focusedNodeId: null,
    }),

  patchGraphsContainingNode: (nodeId, updateNode, options) => {
    let patchedCurrentGraph = false;

    set((state) => {
      let changed = false;
      let nextGraphData = state.graphData;
      let nextGraphCache = state.graphCache;
      let nextStaleGraphCacheKeys = state.staleGraphCacheKeys;

      if (
        state.graphScope &&
        (!options?.scopeKinds ||
          options.scopeKinds.includes(state.graphScope.kind))
      ) {
        const patchedGraphData = patchGraphDataNode(
          state.graphData,
          nodeId,
          updateNode,
        );
        if (patchedGraphData) {
          nextGraphData = patchedGraphData;
          patchedCurrentGraph = true;
          changed = true;
        }
      }

      for (const [scopeKey, cachedGraphData] of Object.entries(
        state.graphCache,
      )) {
        if (!matchesScopeKinds(scopeKey, options?.scopeKinds)) {
          continue;
        }
        const patchedCachedGraphData = patchGraphDataNode(
          cachedGraphData,
          nodeId,
          updateNode,
        );
        if (!patchedCachedGraphData) {
          continue;
        }
        if (nextGraphCache === state.graphCache) {
          nextGraphCache = { ...state.graphCache };
        }
        nextGraphCache[scopeKey] = patchedCachedGraphData;
        if (nextStaleGraphCacheKeys.has(scopeKey)) {
          if (nextStaleGraphCacheKeys === state.staleGraphCacheKeys) {
            nextStaleGraphCacheKeys = new Set(state.staleGraphCacheKeys);
          }
          nextStaleGraphCacheKeys.delete(scopeKey);
        }
        changed = true;
      }

      if (!changed) {
        return state;
      }

      return {
        graphData: nextGraphData,
        graphCache: nextGraphCache,
        staleGraphCacheKeys: nextStaleGraphCacheKeys,
      };
    });

    return patchedCurrentGraph;
  },

  invalidateCachedGraphsContainingNode: (nodeId, options) => {
    let invalidated = false;

    set((state) => {
      let nextGraphCache = state.graphCache;
      let nextStaleGraphCacheKeys = state.staleGraphCacheKeys;

      for (const [scopeKey, cachedGraphData] of Object.entries(
        state.graphCache,
      )) {
        if (
          !matchesScopeKinds(scopeKey, options?.scopeKinds) ||
          !graphContainsNode(cachedGraphData, nodeId)
        ) {
          continue;
        }
        if (nextGraphCache === state.graphCache) {
          nextGraphCache = { ...state.graphCache };
        }
        delete nextGraphCache[scopeKey];
        if (nextStaleGraphCacheKeys.has(scopeKey)) {
          if (nextStaleGraphCacheKeys === state.staleGraphCacheKeys) {
            nextStaleGraphCacheKeys = new Set(state.staleGraphCacheKeys);
          }
          nextStaleGraphCacheKeys.delete(scopeKey);
        }
        invalidated = true;
      }

      if (!invalidated) {
        return state;
      }

      return {
        graphCache: nextGraphCache,
        staleGraphCacheKeys: nextStaleGraphCacheKeys,
      };
    });

    return invalidated;
  },

  setSelectedNodeIds: (nodeIds) => {
    const next = new Set(nodeIds);
    const ordered = Array.from(next);
    const last = ordered.length > 0 ? ordered[ordered.length - 1] : null;
    set({ selectedNodeIds: next, lastSelectedNodeId: last });
  },

  selectSingleNode: (nodeId: string) =>
    set({
      selectedNodeIds: new Set([nodeId]),
      lastSelectedNodeId: nodeId,
    }),

  toggleNodeSelection: (nodeId: string) =>
    set((state) => {
      const next = new Set(state.selectedNodeIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);

      return {
        selectedNodeIds: next,
        lastSelectedNodeId: nodeId,
      };
    }),

  resetGraphState: () =>
    set({
      graphData: EMPTY_GRAPH_DATA,
      fetchedGraphData: EMPTY_GRAPH_DATA,
      pendingGraphData: null,
      selectedNodeIds: new Set(),
      lastSelectedNodeId: null,
      focusedNodeId: null,
      requestedPageSelectionId: null,
      requestedPageOpenDisposition: "default",
      graphScope: null,
      graphPresentationEpoch: 0,
      graphStale: false,
    }),
}));
