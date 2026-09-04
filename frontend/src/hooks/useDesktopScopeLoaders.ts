import { useCallback } from "react";

import {
  fetchNotesGraph,
  fetchPageGraph,
  fetchPagesByParent,
  fetchSmartFolderGraph,
} from "@/api";
import type { ActiveTreeSelectionKind } from "@/components/shell/desktopShellContext";
import { useT } from "@/i18n/useT";
import {
  deriveGraphFilterOptionsFromSources,
  filterPageSummaries,
  type FilterPreset,
  type GraphFilterOptions,
} from "@/lib/graph/filter-state/index";
import { adaptScopeGraphToReusedGraph } from "@/lib/graph/adapter";
import {
  buildSharedBaseGraphData,
  buildSharedBaseTopologyGraph,
} from "@/lib/graph/sharedBaseGraph";
import {
  getManagedBrowseSourceAlias,
  getNotesScopeKey,
  getWorkingBaseScopeKey,
  sourceQueryKeyPart,
} from "@/lib/sources/sourceRegistry";
import { workingBaseReadOptions } from "@/lib/workingBaseReadOptions";
import { setOptionsFromNodes, useGraphFiltersStore } from "@/stores/graphFiltersStore";
import { useSourcesToolbarStore } from "@/stores/sourcesToolbarStore";
import { EMPTY_GRAPH_DATA, getGraphScopeCacheKey, useGraphStore } from "@/stores/graphStore";
import type { PageSummary } from "@/types";
import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";
import type { ActiveSource } from "@/types/source";

type RunWithSelectionLoading = <T>(
  operation: () => Promise<T>,
  mode?: "blocking" | "refresh",
) => Promise<T>;

type UseDesktopScopeLoadersParams = {
  activeSource: ActiveSource | null;
  bridgeBaseUrl: string;
  graphCacheNamespace: string;
  graphDepth: number;
  getSourceRootPages: (source: ActiveSource, options?: { forceRefresh?: boolean }) => Promise<PageSummary[]>;
  notesTreeDataReady: boolean;
  runWithSelectionLoading: RunWithSelectionLoading;
  setActiveSourceNodeId: (value: string | null) => void;
  setActiveTreeSelectionKind: (value: ActiveTreeSelectionKind) => void;
  setSelectedPage: (value: null) => void;
  setSelectionErrorMessage: (message: string) => void;
  setSelectionNoticeMessage: (message: string) => void;
  notesTreePages: PageSummary[];
};

type LoadSourceScopeOptions = {
  activeNodeId?: string | null;
  forceRefresh?: boolean;
  loadingMode?: "blocking" | "refresh";
  shouldApply?: () => boolean;
};

type LoadNotesScopeOptions = {
  baseUrl?: string;
  cacheNamespace?: string;
  forceRefresh?: boolean;
  remount?: boolean;
  shouldApply?: () => boolean;
  source?: ActiveSource | null;
};

function getScopedCacheKey(
  graphCacheNamespace: string,
  scope: Parameters<typeof getGraphScopeCacheKey>[0],
  options?: Parameters<typeof getGraphScopeCacheKey>[1],
) {
  const scopeKey = getGraphScopeCacheKey(scope, options);
  if (!scopeKey) {
    return null;
  }
  return `${graphCacheNamespace}:${scopeKey}`;
}

function getSharedBaseTopologyScopeKey(
  graphCacheNamespace: string,
  source: Extract<ActiveSource, { kind: "shared-base" }>,
) {
  return getScopedCacheKey(graphCacheNamespace, {
    kind: "source",
    id: source.id,
    sourceId: source.id,
  });
}

function sharedBaseReadOptions(
  source: Extract<ActiveSource, { kind: "shared-base" }>,
) {
  return {
    baseRef: `shared:${source.grantId}`,
    recipientActorRef: source.recipientActorRef,
    recipientAccountId: source.recipientAccountId ?? undefined,
  };
}

function scopeNode(
  id: string,
  title: string,
  options?: Partial<GraphResponseNode>,
): GraphResponseNode {
  const normalizedType =
    typeof options?.type === "string" && options.type.trim().length > 0
      ? options.type.trim()
      : "document";
  return {
    id,
    title,
    type: normalizedType,
    status: options?.status ?? "active",
    labels: Array.isArray(options?.labels)
      ? options.labels
      : [normalizedType],
    subject: options?.subject ?? [],
    tags: options?.tags ?? [],
    parentId: options?.parentId,
    snippet: options?.snippet,
    content: options?.content,
    created_at: options?.created_at,
    updated_at: options?.updated_at,
    scope_origin: options?.scope_origin ?? "seed",
  };
}

function applySourceGraph(
  source: ActiveSource,
  graphData: { nodes: GraphResponseNode[]; links: GraphResponseLink[] },
  setActiveTreeSelectionKind: (value: ActiveTreeSelectionKind) => void,
  setActiveSourceNodeId: (value: string | null) => void,
  activeNodeId?: string | null,
  filterOptionNodes?: GraphResponseNode[],
) {
  useGraphStore.getState().setGraphData(graphData);
  useGraphStore.getState().setFetchedGraphData({ nodes: [], links: [] });
  useGraphStore.getState().clearSelectedNodes();
  if (activeNodeId && graphData.nodes.some((node) => String(node.id) === activeNodeId)) {
    useGraphStore.getState().selectSingleNode(activeNodeId);
    useGraphStore.getState().focusNode(activeNodeId);
  }
  useGraphStore.getState().setGraphScope({
    kind: "source",
    id: activeNodeId ?? source.id,
    sourceId: source.id,
  });
  useGraphStore.getState().clearGraphStale();
  setOptionsFromNodes(filterOptionNodes ?? graphData.nodes);
  setActiveTreeSelectionKind("notes");
  setActiveSourceNodeId(activeNodeId ?? null);
}

function applyNotesGraph(
  graphData: { nodes: GraphResponseNode[]; links: GraphResponseLink[] },
  setActiveTreeSelectionKind: (value: ActiveTreeSelectionKind) => void,
  setScopeFilterOptions: (preset?: FilterPreset | null) => void,
  source?: ActiveSource | null,
  remount = false,
) {
  if (remount) {
    useGraphStore.getState().replaceGraphData(graphData);
    useGraphStore.getState().bumpGraphPresentationEpoch();
  } else {
    useGraphStore.getState().setGraphData(graphData);
  }
  useGraphStore.getState().setFetchedGraphData(EMPTY_GRAPH_DATA);
  useGraphStore.getState().clearSelectedNodes();
  useGraphStore.getState().setGraphScope({ kind: "notes", id: "base" });
  useGraphStore.getState().clearGraphStale();
  if (source?.kind === "managed-base") {
    setOptionsFromNodes(graphData.nodes);
  } else {
    setScopeFilterOptions();
  }
  setActiveTreeSelectionKind("notes");
}

function buildScopeOptions(optionPages: PageSummary[]): GraphFilterOptions {
  return deriveGraphFilterOptionsFromSources(
    optionPages.map((page) => ({
      type: page.type,
      status: page.status,
      subject: page.subject ?? [],
      tags: page.tags ?? [],
    })),
  );
}

export function useDesktopScopeLoaders({
  activeSource,
  bridgeBaseUrl,
  graphCacheNamespace,
  graphDepth,
  getSourceRootPages,
  notesTreeDataReady,
  runWithSelectionLoading,
  setActiveSourceNodeId,
  setActiveTreeSelectionKind,
  setSelectedPage,
  setSelectionErrorMessage,
  setSelectionNoticeMessage,
  notesTreePages,
}: UseDesktopScopeLoadersParams) {
  const t = useT();
  const setScopeFilterOptions = useCallback(
    (preset?: FilterPreset | null) => {
      if (!notesTreeDataReady) {
        return;
      }
      const baseOptions = buildScopeOptions(notesTreePages);
      const optionPages = preset
        ? filterPageSummaries(notesTreePages, preset.filter, baseOptions)
        : notesTreePages;
      const scopeOptions = buildScopeOptions(optionPages);
      useGraphFiltersStore.getState().setOptions(scopeOptions, Boolean(preset));
    },
    [notesTreeDataReady, notesTreePages],
  );

  const buildActivePreset = useCallback((presetId: string): FilterPreset | null => {
    const { activePresetFilter, activePresetId, activePresetName } = useGraphFiltersStore.getState();
    if (!activePresetFilter || !activePresetName || activePresetId !== presetId) {
      return null;
    }
    return {
      id: presetId,
      name: activePresetName,
      filter: activePresetFilter,
      created_at: "",
      updated_at: "",
    };
  }, []);

  const getSourceScopeKey = useCallback(
    (source: ActiveSource) =>
      getScopedCacheKey(sourceQueryKeyPart(source), {
        kind: "source",
        id: source.id,
        sourceId: source.id,
      }, { graphDepth }),
    [graphDepth],
  );

  const restoreCachedSourceGraph = useCallback(
    (source: ActiveSource, activeNodeId?: string | null) => {
      const scopeKey = getSourceScopeKey(source);
      if (!scopeKey) {
        return false;
      }

      const cachedGraphData = useGraphStore.getState().getCachedGraphData(scopeKey);
      if (!cachedGraphData || useGraphStore.getState().isCachedGraphStale(scopeKey)) {
        return false;
      }

      const topologyScopeKey =
        source.kind === "shared-base"
          ? getSharedBaseTopologyScopeKey(sourceQueryKeyPart(source), source)
          : null;
      const filterOptionNodes =
        source.kind === "shared-base" && topologyScopeKey
          ? useGraphStore.getState().getCachedGraphData(topologyScopeKey)?.nodes ??
            cachedGraphData.nodes
          : cachedGraphData.nodes;

      applySourceGraph(
        source,
        cachedGraphData,
        setActiveTreeSelectionKind,
        setActiveSourceNodeId,
        activeNodeId,
        filterOptionNodes,
      );
      if (source.kind === "shared-base") {
        const cachedNotice =
          useGraphStore.getState().getSharedBasePartialLoadNotice(scopeKey);
        setSelectionNoticeMessage(cachedNotice ?? "");
      }
      return true;
    },
    [
      getSourceScopeKey,
      setActiveSourceNodeId,
      setActiveTreeSelectionKind,
      setSelectionNoticeMessage,
    ],
  );

  const cacheSourceGraph = useCallback(
    (
      source: ActiveSource,
      graphData: { nodes: GraphResponseNode[]; links: GraphResponseLink[] },
      activeNodeId?: string | null,
    ) => {
      void activeNodeId;
      const scopeKey = getSourceScopeKey(source);
      if (!scopeKey) {
        return;
      }
      useGraphStore.getState().cacheGraphData(scopeKey, graphData);
    },
    [getSourceScopeKey],
  );

  const mapRootPageToSourceNode = useCallback((page: PageSummary): GraphResponseNode =>
    scopeNode(page.id, page.title, {
      type: page.type,
      status: page.status,
      subject: page.subject,
      tags: page.tags,
      parentId: page.parent_id,
      created_at: page.created_at,
      updated_at: page.updated_at,
    }), []);

  const loadSharedBasePagesRecursively = useCallback(
    async (
      source: Extract<ActiveSource, { kind: "shared-base" }>,
    ): Promise<PageSummary[]> => {
      const queue: Array<string | null> = [null];
      const visitedParentIds = new Set<string>();
      const pagesById = new Map<string, PageSummary>();

      while (queue.length > 0) {
        const parentId = queue.shift() ?? null;
        const parentKey = parentId ?? "__root__";
        if (visitedParentIds.has(parentKey)) {
          continue;
        }
        visitedParentIds.add(parentKey);

        const result = await fetchPagesByParent(
          bridgeBaseUrl,
          parentId ?? "root",
          sharedBaseReadOptions(source),
        );

        for (const item of result) {
          if (!pagesById.has(item.id)) {
            pagesById.set(item.id, item);
            queue.push(item.id);
          }
        }
      }

      return Array.from(pagesById.values());
    },
    [bridgeBaseUrl],
  );

  const getBaseNotesGraphData = useCallback(
    async (options?: {
      baseUrl?: string;
      cacheNamespace?: string;
      forceRefresh?: boolean;
      source?: ActiveSource | null;
    }) => {
      const baseUrl = options?.baseUrl ?? bridgeBaseUrl;
      const cacheNamespace = options?.cacheNamespace ?? graphCacheNamespace;
      const source = options?.source !== undefined ? options.source : activeSource;
      if (!baseUrl) {
        return EMPTY_GRAPH_DATA;
      }

      const scope = { kind: "notes", id: "base" } as const;
      const scopeKey = getScopedCacheKey(cacheNamespace, scope, { graphDepth });
      const cachedGraphData =
        scopeKey && !options?.forceRefresh
          ? !useGraphStore.getState().isCachedGraphStale(scopeKey)
            ? useGraphStore.getState().getCachedGraphData(scopeKey)
            : null
          : null;

      if (cachedGraphData) {
        return cachedGraphData;
      }

      const scopeGraph = await runWithSelectionLoading(
        () => fetchNotesGraph(baseUrl, graphDepth, workingBaseReadOptions(source)),
        "refresh",
      );
      const graphData = adaptScopeGraphToReusedGraph(scopeGraph);

      if (scopeKey) {
        useGraphStore.getState().cacheGraphData(scopeKey, graphData);
      }

      return graphData;
    },
    [activeSource, bridgeBaseUrl, graphCacheNamespace, graphDepth, runWithSelectionLoading],
  );

  const loadNotesScope = useCallback(
    async (options?: LoadNotesScopeOptions) => {
      const baseUrl = options?.baseUrl ?? bridgeBaseUrl;
      const cacheNamespace = options?.cacheNamespace ?? graphCacheNamespace;
      if (!baseUrl) {
        return;
      }

      const scope = { kind: "notes", id: "base" } as const;
      const source = options?.source !== undefined ? options.source : activeSource;
      const graphData = await getBaseNotesGraphData({
        baseUrl,
        cacheNamespace,
        forceRefresh: options?.forceRefresh,
        source,
      });

      if (options?.shouldApply && !options.shouldApply()) {
        return;
      }

      if (graphData.nodes.length === 0) {
        useGraphStore.getState().resetGraphState();
        useGraphStore.getState().setGraphScope(scope);
        useGraphStore.getState().clearGraphStale();
        if (options?.remount) {
          useGraphStore.getState().bumpGraphPresentationEpoch();
        }
        if (source?.kind === "managed-base") {
          setOptionsFromNodes([]);
        } else {
          setScopeFilterOptions();
        }
        setActiveTreeSelectionKind("notes");
        return;
      }
      applyNotesGraph(
        graphData,
        setActiveTreeSelectionKind,
        setScopeFilterOptions,
        source,
        options?.remount === true,
      );
    },
    [
      activeSource,
      bridgeBaseUrl,
      getBaseNotesGraphData,
      graphCacheNamespace,
      setActiveTreeSelectionKind,
      setScopeFilterOptions,
    ],
  );

  const loadSmartFolderGraphById = useCallback(
    async (presetId: string, options?: { baseUrl?: string; forceRefresh?: boolean }) => {
      const baseUrl = options?.baseUrl ?? bridgeBaseUrl;
      if (!baseUrl) {
        return;
      }

      const activePreset = buildActivePreset(presetId);
      const scope = { kind: "smart-folder", id: "base", presetId } as const;
      const scopeKey = getScopedCacheKey(graphCacheNamespace, scope, { graphDepth });
      const cachedGraphData =
        scopeKey && !options?.forceRefresh
          ? !useGraphStore.getState().isCachedGraphStale(scopeKey)
            ? useGraphStore.getState().getCachedGraphData(scopeKey)
            : null
          : null;

      const applySmartFolderGraph = (graphData: { nodes: GraphResponseNode[]; links: GraphResponseLink[] }) => {
        useGraphStore.getState().setGraphScope(scope);
        useGraphStore.getState().replaceGraphData(graphData);
        useGraphStore.getState().setFetchedGraphData(EMPTY_GRAPH_DATA);
        useGraphStore.getState().clearSelectedNodes();
        useGraphStore.getState().clearGraphStale();
        if (activePreset) {
          setScopeFilterOptions(activePreset);
        } else {
          setOptionsFromNodes(graphData.nodes);
        }
        setActiveTreeSelectionKind("smart-folder");
        useGraphStore.getState().bumpGraphPresentationEpoch();
        useSourcesToolbarStore.getState().requestZoomToFit();
      };

      useGraphStore.getState().setGraphScope(scope);

      if (cachedGraphData) {
        applySmartFolderGraph(cachedGraphData);
        return;
      }

      useGraphStore.getState().replaceGraphData(EMPTY_GRAPH_DATA);
      useGraphStore.getState().clearSelectedNodes();

      const scopeGraph = await runWithSelectionLoading(
        () =>
          fetchSmartFolderGraph(
            baseUrl,
            presetId,
            graphDepth,
            workingBaseReadOptions(activeSource),
          ),
        "blocking",
      );
      const graphData = adaptScopeGraphToReusedGraph(scopeGraph);

      if (scopeKey) {
        useGraphStore.getState().cacheGraphData(scopeKey, graphData);
      }
      applySmartFolderGraph(graphData);
    },
    [
      buildActivePreset,
      bridgeBaseUrl,
      activeSource,
      getBaseNotesGraphData,
      graphCacheNamespace,
      graphDepth,
      runWithSelectionLoading,
      setScopeFilterOptions,
      setActiveTreeSelectionKind,
    ],
  );

  const loadSmartFolderScope = useCallback(
    async (preset: FilterPreset, options?: { baseUrl?: string; forceRefresh?: boolean }) => {
      const baseUrl = options?.baseUrl ?? bridgeBaseUrl;
      if (!baseUrl) {
        return;
      }

      useGraphFiltersStore.getState().setActivePreset(preset);
      setScopeFilterOptions(preset);
      setActiveTreeSelectionKind("smart-folder");
      useGraphStore.getState().setGraphScope({
        kind: "smart-folder",
        id: "base",
        presetId: preset.id,
      });
      await loadSmartFolderGraphById(preset.id, { baseUrl, forceRefresh: options?.forceRefresh });
    },
    [bridgeBaseUrl, loadSmartFolderGraphById, setActiveTreeSelectionKind, setScopeFilterOptions],
  );

  const clearSmartFolderScope = useCallback(() => {
    useGraphStore.getState().resetGraphState();
    setSelectedPage(null);
    setSelectionErrorMessage("");
    setSelectionNoticeMessage("");
    setActiveTreeSelectionKind("notes");
    setActiveSourceNodeId(null);
    setScopeFilterOptions();
  }, [
    setActiveSourceNodeId,
    setActiveTreeSelectionKind,
    setScopeFilterOptions,
    setSelectedPage,
    setSelectionErrorMessage,
    setSelectionNoticeMessage,
  ]);

  const loadSourceScope = useCallback(
    async (source: ActiveSource, options?: LoadSourceScopeOptions) => {
      if (!bridgeBaseUrl) {
        return;
      }

      if (source.kind === "local-base" || source.kind === "managed-base") {
        if (options?.shouldApply && !options.shouldApply()) {
          return;
        }
        await loadNotesScope({
          cacheNamespace: getNotesScopeKey(source, getWorkingBaseScopeKey(source)),
          forceRefresh: options?.forceRefresh,
          remount: true,
          shouldApply: options?.shouldApply,
          source,
        });
        return;
      }

      const activeNodeId = options?.activeNodeId ?? null;
      const loadingMode = options?.loadingMode ?? "refresh";
      if (!options?.forceRefresh && restoreCachedSourceGraph(source, activeNodeId)) {
        return;
      }

      if (source.kind === "shared-base") {
        const allPages = await runWithSelectionLoading(
          () => loadSharedBasePagesRecursively(source),
          loadingMode,
        );
        if (options?.shouldApply && !options.shouldApply()) {
          return;
        }
        const topologyGraphData = buildSharedBaseTopologyGraph(
          allPages,
          mapRootPageToSourceNode,
        );
        const topologyScopeKey = getSharedBaseTopologyScopeKey(
          sourceQueryKeyPart(source),
          source,
        );
        if (topologyScopeKey) {
          useGraphStore.getState().cacheGraphData(topologyScopeKey, topologyGraphData);
        }
        const graphResult = await buildSharedBaseGraphData(
          allPages,
          graphDepth,
          mapRootPageToSourceNode,
          (pageId) =>
            fetchPageGraph(
              bridgeBaseUrl,
              pageId,
              graphDepth,
              sharedBaseReadOptions(source),
            ),
          activeNodeId,
        );
        if (graphResult.loadStats.failedPageCount > 0) {
          const noticeMessage = t("graph.sharedBase.partialPageGraphLoad", {
            loaded: String(graphResult.loadStats.loadedPageGraphCount),
            requested: String(graphResult.loadStats.requestedPageCount),
          });
          setSelectionNoticeMessage(noticeMessage);
          const scopeKey = getSourceScopeKey(source);
          if (scopeKey) {
            useGraphStore.getState().cacheSharedBasePartialLoadNotice(scopeKey, noticeMessage);
          }
        } else {
          setSelectionNoticeMessage("");
          const scopeKey = getSourceScopeKey(source);
          if (scopeKey) {
            useGraphStore.getState().clearSharedBasePartialLoadNotice(scopeKey);
          }
        }
        const graphData = {
          nodes: graphResult.nodes,
          links: graphResult.links,
        };
        const resolvedActiveNodeId =
          activeNodeId
          ?? allPages.find((page) => page.parent_id === null)?.id
          ?? graphData.nodes[0]?.id?.toString()
          ?? allPages.find((page) => page.parent_id === null)?.id
          ?? allPages[0]?.id
          ?? null;
        cacheSourceGraph(source, graphData, resolvedActiveNodeId);
        applySourceGraph(
          source,
          graphData,
          setActiveTreeSelectionKind,
          setActiveSourceNodeId,
          resolvedActiveNodeId,
          topologyGraphData.nodes,
        );
        return;
      }

      if (source.kind === "file-home") {
        return;
      }

      const rootPages = await runWithSelectionLoading(
        () => getSourceRootPages(source, { forceRefresh: options?.forceRefresh }),
        "refresh",
      );
      if (options?.shouldApply && !options.shouldApply()) {
        return;
      }
      const nodes = rootPages.map(mapRootPageToSourceNode);
      const graphData = { nodes, links: [] };
      const resolvedActiveNodeId = activeNodeId ?? rootPages[0]?.id ?? null;
      cacheSourceGraph(source, graphData, resolvedActiveNodeId);
      applySourceGraph(source, graphData, setActiveTreeSelectionKind, setActiveSourceNodeId, resolvedActiveNodeId);
    },
    [
      bridgeBaseUrl,
      cacheSourceGraph,
      getSourceRootPages,
      graphDepth,
      loadNotesScope,
      loadSharedBasePagesRecursively,
      mapRootPageToSourceNode,
      getSourceScopeKey,
      restoreCachedSourceGraph,
      runWithSelectionLoading,
      setActiveSourceNodeId,
      setActiveTreeSelectionKind,
      setSelectionNoticeMessage,
      t,
    ],
  );

  const selectSourceNode = useCallback(
    async (source: ActiveSource, nodeId: string) => {
      const nodeExists = useGraphStore
        .getState()
        .graphData?.nodes?.some((node) => String(node.id) === nodeId);
      if (nodeExists) {
        useGraphStore.getState().selectSingleNode(nodeId);
        useGraphStore.getState().focusNode(nodeId);
      }
      if (source.kind === "shared-base") {
        setActiveSourceNodeId(nodeId);
        return;
      }
      if (source.kind === "local-base") {
        setActiveSourceNodeId(nodeId);
        return;
      }
      if (getManagedBrowseSourceAlias(source) !== null) {
        setActiveSourceNodeId(nodeId);
        return;
      }
      if (source.kind === "managed-base") {
        setActiveSourceNodeId(nodeId);
      }
    },
    [setActiveSourceNodeId],
  );

  return {
    buildActivePreset,
    clearSmartFolderScope,
    loadSmartFolderGraphById,
    loadSmartFolderScope,
    loadNotesScope,
    loadSourceScope,
    selectSourceNode,
    setScopeFilterOptions,
  };
}
