import { useCallback, useEffect, useRef } from "react";

import {
  fetchPage,
  fetchPageGraph,
} from "@/api";
import type { ActiveTreeSelectionKind } from "@/components/shell/desktopShellContext";
import { isEditorMarkdownEquivalent } from "@/components/editor/markdownInterop";
import { BridgeClientError } from "@/lib/bridgeClient";
import { adaptPageGraphToReusedGraph } from "@/lib/graph/adapter";
import { setOptionsFromNodes } from "@/stores/graphFiltersStore";
import {
  EMPTY_GRAPH_DATA,
  getGraphScopeCacheKey,
  type GraphDataState,
  type GraphScope,
  useGraphStore,
} from "@/stores/graphStore";
import type { PageDetail, PageSummary } from "@/types";
import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";
import type { ActiveSource } from "@/types/source";
import { openPageInFileTabs } from "@/lib/application/pageOpenIntent";
import type { PageOpenDisposition } from "@/lib/pageOpenTabs";
import { workingBaseReadOptions } from "@/lib/workingBaseReadOptions";

type RunWithSelectionLoading = <T>(
  operation: () => Promise<T>,
  mode?: "blocking" | "refresh",
) => Promise<T>;

type UseDesktopSelectionPageScopesParams = {
  activeSource: ActiveSource | null;
  activeTreeSelectionKind: ActiveTreeSelectionKind;
  bridgeBaseUrl: string;
  graphCacheNamespace: string;
  graphDepth: number;
  graphScope: GraphScope;
  notesTreePages: PageSummary[];
  dirtyPageIds: string[];
  openTabs: PageDetail[];
  runWithSelectionLoading: RunWithSelectionLoading;
  setActiveTreeSelectionKind: (value: ActiveTreeSelectionKind) => void;
  setEditorDrafts: (
    value:
      | Record<string, string>
      | ((current: Record<string, string>) => Record<string, string>),
  ) => void;
  setOpenTabs: (
    value: PageDetail[] | ((current: PageDetail[]) => PageDetail[]),
  ) => void;
  setSelectedPage: (value: PageDetail | null) => void;
  selectedPageId: string | null;
  notesScopeKey: string;
};

type PageOpenOptions = {
  baseUrl?: string;
  forceRefresh?: boolean;
  loadingMode?: "blocking" | "refresh";
  pageDetail?: PageDetail;
  tabDisposition?: PageOpenDisposition;
  treeSelectionKind?: ActiveTreeSelectionKind | null;
};

function pageReadOptions(activeSource: ActiveSource | null) {
  return workingBaseReadOptions(activeSource);
}

function getPageScopeKey(
  graphCacheNamespace: string,
  pageId: string,
  graphDepth: number,
) {
  const scope = { kind: "page", id: pageId } as const;
  return `${graphCacheNamespace}:${getGraphScopeCacheKey(scope, { graphDepth })}`;
}

function applyPageGraph(pageId: string, graphData: GraphDataState) {
  useGraphStore.getState().setGraphData(graphData);
  useGraphStore.getState().setFetchedGraphData(EMPTY_GRAPH_DATA);
  useGraphStore.getState().setGraphScope({ kind: "page", id: pageId });
  useGraphStore.getState().clearGraphStale();
  useGraphStore.getState().selectSingleNode(pageId);
  useGraphStore.getState().focusNode(pageId);
  setOptionsFromNodes(graphData?.nodes ?? []);
}

function applySmartFolderPagePreview(pageId: string, graphData: GraphDataState) {
  useGraphStore.getState().setFetchedGraphData(graphData);
  useGraphStore.getState().clearGraphStale();
  useGraphStore.getState().selectSingleNode(pageId);
  useGraphStore.getState().focusNode(pageId);
}

function sharedBaseDetailNode(page: PageDetail): GraphResponseNode {
  return {
    id: page.id,
    title: page.title,
    type: page.type,
    status: page.status,
    labels: [page.type],
    subject: [...page.subject],
    tags: [...page.tags],
    parentId: page.parent_id,
    created_at: page.created_at,
    updated_at: page.updated_at,
    reviewed_at: page.reviewed_at ?? undefined,
    review_interval_days: page.review_interval_days,
    snippet: page.content.slice(0, 180),
    content: page.content,
  };
}

function sharedBaseContextNode(
  id: string,
  title: string,
  options: Partial<GraphResponseNode> = {},
): GraphResponseNode {
  const normalizedType =
    typeof options.type === "string" && options.type.trim().length > 0
      ? options.type
      : "document";
  return {
    id,
    title,
    type: normalizedType,
    status: options.status ?? "active",
    labels: options.labels ?? [normalizedType],
    subject: options.subject ?? [],
    tags: options.tags ?? [],
    parentId: options.parentId,
    snippet: options.snippet ?? "",
    content: options.content,
    created_at: options.created_at,
    updated_at: options.updated_at,
    reviewed_at: options.reviewed_at,
    review_interval_days: options.review_interval_days,
    scope_origin: options.scope_origin ?? "context",
  };
}

function getLinkKey(link: GraphResponseLink): string {
  const sourceId =
    typeof link.source === "string" ? link.source : String(link.source.id);
  const targetId =
    typeof link.target === "string" ? link.target : String(link.target.id);
  return `${sourceId}:${targetId}:${link.type ?? ""}:${link.parentChild ? "parent" : "link"}`;
}

export function buildSharedBasePageGraph(
  page: PageDetail,
  graphDepth: number,
  sourceTopology?: GraphDataState | null,
): GraphDataState {
  const effectiveGraphHops = Math.max(1, graphDepth);
  const nodeById = new Map<string, GraphResponseNode>();
  const linksByKey = new Map<string, GraphResponseLink>();

  for (const node of sourceTopology?.nodes ?? []) {
    nodeById.set(String(node.id), { ...node });
  }

  const adjacency = new Map<string, GraphResponseLink[]>();
  for (const link of sourceTopology?.links ?? []) {
    const sourceId =
      typeof link.source === "string" ? link.source : String(link.source.id);
    const targetId =
      typeof link.target === "string" ? link.target : String(link.target.id);
    const normalizedLink = {
      ...link,
      source: sourceId,
      target: targetId,
    };
    linksByKey.set(getLinkKey(normalizedLink), normalizedLink);
    adjacency.set(sourceId, [...(adjacency.get(sourceId) ?? []), normalizedLink]);
    adjacency.set(targetId, [...(adjacency.get(targetId) ?? []), normalizedLink]);
  }

  const includedNodeIds = new Set<string>([page.id]);
  const queue: Array<{ id: string; depth: number }> = [{ id: page.id, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= effectiveGraphHops) {
      continue;
    }
    for (const link of adjacency.get(current.id) ?? []) {
      const sourceId =
        typeof link.source === "string" ? link.source : String(link.source.id);
      const targetId =
        typeof link.target === "string" ? link.target : String(link.target.id);
      const neighborId = sourceId === current.id ? targetId : sourceId;
      if (includedNodeIds.has(neighborId)) {
        continue;
      }
      includedNodeIds.add(neighborId);
      queue.push({ id: neighborId, depth: current.depth + 1 });
    }
  }

  nodeById.set(page.id, sharedBaseDetailNode(page));

  if (effectiveGraphHops > 0 && page.parent) {
    includedNodeIds.add(page.parent.id);
    nodeById.set(
      page.parent.id,
      nodeById.get(page.parent.id) ??
        sharedBaseContextNode(page.parent.id, page.parent.title, {
          type: "structure",
          parentId: null,
          created_at: page.created_at,
          updated_at: page.updated_at,
        }),
    );
    const parentLink: GraphResponseLink = {
      source: page.parent.id,
      target: page.id,
      type: "parent",
      parentChild: true,
    };
    linksByKey.set(getLinkKey(parentLink), parentLink);
  }

  for (const child of effectiveGraphHops > 0 ? page.sub_items : []) {
    includedNodeIds.add(child.id);
    nodeById.set(
      child.id,
      nodeById.get(child.id) ??
        sharedBaseContextNode(child.id, child.title, {
          parentId: page.id,
          created_at: page.created_at,
          updated_at: page.updated_at,
        }),
    );
    const childLink: GraphResponseLink = {
      source: page.id,
      target: child.id,
      type: "parent",
      parentChild: true,
    };
    linksByKey.set(getLinkKey(childLink), childLink);
  }

  for (const connection of effectiveGraphHops > 0 ? page.connected_to : []) {
    includedNodeIds.add(connection.id);
    nodeById.set(
      connection.id,
      nodeById.get(connection.id) ??
        sharedBaseContextNode(connection.id, connection.title, {
          created_at: page.created_at,
          updated_at: page.updated_at,
        }),
    );
    const connectionLink: GraphResponseLink = {
      source: page.id,
      target: connection.id,
      type: connection.link_type,
      parentChild: false,
    };
    linksByKey.set(getLinkKey(connectionLink), connectionLink);
  }

  for (const mention of effectiveGraphHops > 0 ? page.inline_mentions : []) {
    includedNodeIds.add(mention.id);
    nodeById.set(
      mention.id,
      nodeById.get(mention.id) ??
        sharedBaseContextNode(mention.id, mention.title, {
          created_at: page.created_at,
          updated_at: page.updated_at,
        }),
    );
  }

  const nodes = [...includedNodeIds]
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is GraphResponseNode => Boolean(node));
  const links = [...linksByKey.values()].filter((link) => {
    const sourceId =
      typeof link.source === "string" ? link.source : String(link.source.id);
    const targetId =
      typeof link.target === "string" ? link.target : String(link.target.id);
    return includedNodeIds.has(sourceId) && includedNodeIds.has(targetId);
  });

  return { nodes, links };
}

export function reconcileDraftsWithIncomingPage(
  currentDrafts: Record<string, string>,
  previousPageDetail: PageDetail | null,
  nextPageDetail: PageDetail | null | undefined,
): Record<string, string> {
  if (!nextPageDetail) {
    return currentDrafts;
  }
  const currentDraft = currentDrafts[nextPageDetail.id];
  if (currentDraft === undefined) {
    return currentDrafts;
  }

  if (isEditorMarkdownEquivalent(currentDraft, nextPageDetail.content)) {
    const nextDrafts = { ...currentDrafts };
    delete nextDrafts[nextPageDetail.id];
    return nextDrafts;
  }

  if (
    previousPageDetail !== null &&
    isEditorMarkdownEquivalent(currentDraft, previousPageDetail.content)
  ) {
    const nextDrafts = { ...currentDrafts };
    delete nextDrafts[nextPageDetail.id];
    return nextDrafts;
  }

  return currentDrafts;
}

export function useDesktopSelectionPageScopes({
  activeSource,
  activeTreeSelectionKind,
  bridgeBaseUrl,
  graphCacheNamespace,
  graphDepth,
  graphScope,
  dirtyPageIds,
  notesTreePages,
  openTabs,
  runWithSelectionLoading,
  setActiveTreeSelectionKind,
  setEditorDrafts,
  setOpenTabs,
  setSelectedPage,
  selectedPageId,
  notesScopeKey,
}: UseDesktopSelectionPageScopesParams) {
  void graphScope;
  void notesTreePages;
  const latestNotesScopeKeyRef = useRef(notesScopeKey);

  useEffect(() => {
    latestNotesScopeKeyRef.current = notesScopeKey;
  }, [notesScopeKey]);

  const syncSelectedPageState = useCallback(
    (
      pageDetail: PageDetail | null | undefined,
      treeSelectionKind: ActiveTreeSelectionKind | null,
      options?: {
        preserveGraphSelection?: boolean;
        tabDisposition?: PageOpenDisposition;
      },
    ) => {
      if (!pageDetail) {
        return;
      }
      const previousPageDetail =
        openTabs.find((tab) => tab.id === pageDetail.id) ?? null;
      setEditorDrafts((current) =>
        reconcileDraftsWithIncomingPage(
          current,
          previousPageDetail,
          pageDetail,
        ),
      );
      setSelectedPage(pageDetail);
      setOpenTabs((current) =>
        openPageInFileTabs(current, selectedPageId, dirtyPageIds, {
          page: pageDetail,
          disposition: options?.tabDisposition,
        }),
      );

      if (!options?.preserveGraphSelection) {
        useGraphStore.getState().selectSingleNode(pageDetail.id);
        useGraphStore.getState().focusNode(pageDetail.id);
      }
      if (treeSelectionKind) {
        setActiveTreeSelectionKind(treeSelectionKind);
      }
    },
    [
      dirtyPageIds,
      openTabs,
      selectedPageId,
      setActiveTreeSelectionKind,
      setEditorDrafts,
      setOpenTabs,
      setSelectedPage,
    ],
  );

  const handleMissingPage = useCallback(
    (pageId: string) => {
      setOpenTabs((current) => current.filter((tab) => tab.id !== pageId));
      if (selectedPageId === pageId) {
        setSelectedPage(null);
        useGraphStore.getState().clearSelectedNodes();
        if (useGraphStore.getState().graphScope?.kind === "page") {
          useGraphStore.getState().setGraphScope(null);
        }
      }
    },
    [selectedPageId, setOpenTabs, setSelectedPage],
  );

  const refreshOpenPageInPlace = useCallback(
    async (pageId: string, options?: PageOpenOptions) => {
      try {
        const baseUrl = options?.baseUrl ?? bridgeBaseUrl;
        const expectedNotesScopeKey = notesScopeKey;
        if (!baseUrl) {
          return;
        }

        const pageDetail = await runWithSelectionLoading(async () => {
          if (options?.pageDetail) {
            return options.pageDetail;
          }
          return fetchPage(baseUrl, pageId, pageReadOptions(activeSource));
        }, options?.loadingMode ?? "refresh");

        if (latestNotesScopeKeyRef.current !== expectedNotesScopeKey) {
          return;
        }

        const previousPageDetail = openTabs.find((tab) => tab.id === pageId) ?? null;
        const isActiveSelectedPage = selectedPageId === pageId;

        setOpenTabs((current) => {
          const existingIndex = current.findIndex((tab) => tab.id === pageId);
          if (existingIndex === -1) {
            return current;
          }
          return current.map((tab) => (tab.id === pageId ? pageDetail : tab));
        });

        if (isActiveSelectedPage) {
          syncSelectedPageState(pageDetail, activeTreeSelectionKind === "page" ? "page" : null, {
            preserveGraphSelection: true,
          });
          return;
        }

        setEditorDrafts((current) =>
          reconcileDraftsWithIncomingPage(current, previousPageDetail, pageDetail),
        );
      } catch (error) {
        if (error instanceof BridgeClientError && error.status === 404) {
          handleMissingPage(pageId);
          return;
        }
        throw error;
      }
    },
    [
      activeSource,
      activeTreeSelectionKind,
      bridgeBaseUrl,
      handleMissingPage,
      openTabs,
      runWithSelectionLoading,
      selectedPageId,
      setEditorDrafts,
      syncSelectedPageState,
      notesScopeKey,
    ],
  );

  const openSelectedPage = useCallback(
    async (pageId: string, options?: PageOpenOptions) => {
      try {
        const baseUrl = options?.baseUrl ?? bridgeBaseUrl;
        const expectedNotesScopeKey = notesScopeKey;
        if (!baseUrl) {
          return;
        }

        const pageDetail = await runWithSelectionLoading(async () => {
          if (options?.pageDetail) {
            return options.pageDetail;
          }
          return fetchPage(baseUrl, pageId, pageReadOptions(activeSource));
        }, options?.loadingMode ?? "blocking");

        if (latestNotesScopeKeyRef.current !== expectedNotesScopeKey) {
          return;
        }
        syncSelectedPageState(pageDetail, options?.treeSelectionKind ?? null, {
          tabDisposition: options?.tabDisposition,
        });
      } catch (error) {
        if (error instanceof BridgeClientError && error.status === 404) {
          handleMissingPage(pageId);
          return;
        }
        throw error;
      }
    },
    [
      activeSource,
      bridgeBaseUrl,
      handleMissingPage,
      runWithSelectionLoading,
      syncSelectedPageState,
      notesScopeKey,
    ],
  );

  const loadSelectedPage = useCallback(
    async (pageId: string, options?: PageOpenOptions) => {
      try {
        const baseUrl = options?.baseUrl ?? bridgeBaseUrl;
        const expectedNotesScopeKey = notesScopeKey;
        if (!baseUrl) {
          return;
        }

        const pageScopeKey = getPageScopeKey(
          graphCacheNamespace,
          pageId,
          graphDepth,
        );
        const cachedGraphData = options?.forceRefresh
          ? null
          : !useGraphStore.getState().isCachedGraphStale(pageScopeKey)
            ? useGraphStore.getState().getCachedGraphData(pageScopeKey)
            : null;

        if (cachedGraphData) {
          const pageDetail = await runWithSelectionLoading(async () => {
            if (options?.pageDetail) {
              return options.pageDetail;
            }
            return fetchPage(baseUrl, pageId, pageReadOptions(activeSource));
          }, options?.loadingMode ?? "blocking");

          if (latestNotesScopeKeyRef.current !== expectedNotesScopeKey) {
            return;
          }
          syncSelectedPageState(pageDetail, "page", {
            tabDisposition: options?.tabDisposition,
          });
          applyPageGraph(pageDetail.id, cachedGraphData);
          return;
        }

        const pageDetail = await runWithSelectionLoading(async () => {
          if (options?.pageDetail) {
            return options.pageDetail;
          }
          return fetchPage(baseUrl, pageId, pageReadOptions(activeSource));
        }, options?.loadingMode ?? "blocking");
        const graphData =
          adaptPageGraphToReusedGraph(
            await runWithSelectionLoading(
              () =>
                fetchPageGraph(
                  baseUrl,
                  pageId,
                  graphDepth,
                  pageReadOptions(activeSource),
                ),
              options?.loadingMode ?? "blocking",
            ),
          );

        if (latestNotesScopeKeyRef.current !== expectedNotesScopeKey) {
          return;
        }
        useGraphStore.getState().cacheGraphData(pageScopeKey, graphData);
        syncSelectedPageState(pageDetail, "page", {
          tabDisposition: options?.tabDisposition,
        });
        applyPageGraph(pageDetail.id, graphData);
      } catch (error) {
        if (error instanceof BridgeClientError && error.status === 404) {
          handleMissingPage(pageId);
          return;
        }
        throw error;
      }
    },
    [
      activeSource,
      bridgeBaseUrl,
      graphCacheNamespace,
      graphDepth,
      handleMissingPage,
      runWithSelectionLoading,
      syncSelectedPageState,
      notesScopeKey,
    ],
  );

  const previewSelectedPageInSmartFolder = useCallback(
    async (pageId: string, options?: PageOpenOptions) => {
      try {
        const baseUrl = options?.baseUrl ?? bridgeBaseUrl;
        const expectedNotesScopeKey = notesScopeKey;
        if (!baseUrl) {
          return;
        }

        const pageScopeKey = getPageScopeKey(
          graphCacheNamespace,
          pageId,
          graphDepth,
        );
        const cachedGraphData = options?.forceRefresh
          ? null
          : !useGraphStore.getState().isCachedGraphStale(pageScopeKey)
            ? useGraphStore.getState().getCachedGraphData(pageScopeKey)
            : null;

        const pageDetail = await runWithSelectionLoading(async () => {
          if (options?.pageDetail) {
            return options.pageDetail;
          }
          return fetchPage(baseUrl, pageId, pageReadOptions(activeSource));
        }, options?.loadingMode ?? "blocking");

        if (latestNotesScopeKeyRef.current !== expectedNotesScopeKey) {
          return;
        }

        syncSelectedPageState(pageDetail, "smart-folder", {
          preserveGraphSelection: true,
        });

        if (cachedGraphData) {
          applySmartFolderPagePreview(pageId, cachedGraphData);
          return;
        }

        const graphData = adaptPageGraphToReusedGraph(
          await runWithSelectionLoading(
            () =>
              fetchPageGraph(
                baseUrl,
                pageId,
                graphDepth,
                pageReadOptions(activeSource),
              ),
            options?.loadingMode ?? "blocking",
          ),
        );

        if (latestNotesScopeKeyRef.current !== expectedNotesScopeKey) {
          return;
        }

        useGraphStore.getState().cacheGraphData(pageScopeKey, graphData);
        applySmartFolderPagePreview(pageId, graphData);
      } catch (error) {
        if (error instanceof BridgeClientError && error.status === 404) {
          handleMissingPage(pageId);
          return;
        }
        throw error;
      }
    },
    [
      activeSource,
      bridgeBaseUrl,
      graphCacheNamespace,
      graphDepth,
      handleMissingPage,
      runWithSelectionLoading,
      syncSelectedPageState,
      notesScopeKey,
    ],
  );

  const refreshPageGraph = useCallback(
    async (pageId: string, options?: { baseUrl?: string }) => {
      const baseUrl = options?.baseUrl ?? bridgeBaseUrl;
      if (!baseUrl) {
        return;
      }

      const graphData =
        adaptPageGraphToReusedGraph(
          await runWithSelectionLoading(
            () =>
              fetchPageGraph(
                baseUrl,
                pageId,
                graphDepth,
                pageReadOptions(activeSource),
              ),
            "refresh",
          ),
        );
      const pageScopeKey = getPageScopeKey(
        graphCacheNamespace,
        pageId,
        graphDepth,
      );

      useGraphStore.getState().cacheGraphData(pageScopeKey, graphData);
      applyPageGraph(pageId, graphData);
    },
    [
      activeSource,
      bridgeBaseUrl,
      graphCacheNamespace,
      graphDepth,
      runWithSelectionLoading,
    ],
  );

  return {
    loadSelectedPage,
    openSelectedPage,
    previewSelectedPageInSmartFolder,
    refreshOpenPageInPlace,
    refreshPageGraph,
  };
}
