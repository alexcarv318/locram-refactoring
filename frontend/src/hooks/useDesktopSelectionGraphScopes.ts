import { useCallback } from "react";

import type { ActiveTreeSelectionKind } from "@/components/shell/desktopShellContext";
import type { FilterPreset } from "@/lib/graph/filter-state/index";
import { useGraphFiltersStore } from "@/stores/graphFiltersStore";
import type { GraphScope } from "@/stores/graphStore";
import type { PageOpenDisposition } from "@/lib/pageOpenTabs";
import type { PageDetail, PageSummary } from "@/types";
import type { ActiveSource } from "@/types/source";
import { useDesktopSelectionPageScopes } from "./useDesktopSelectionPageScopes";
import { useDesktopScopeLoaders } from "./useDesktopScopeLoaders";

type RunWithSelectionLoading = <T>(
  operation: () => Promise<T>,
  mode?: "blocking" | "refresh",
) => Promise<T>;

type UseDesktopSelectionGraphScopesParams = {
  activeTreeSelectionKind: ActiveTreeSelectionKind;
  activeSource: ActiveSource | null;
  bridgeBaseUrl: string;
  graphCacheNamespace: string;
  graphDepth: number;
  graphMode: "synced" | "frozen";
  graphScope: GraphScope;
  getSourceRootPages: (source: ActiveSource, options?: { forceRefresh?: boolean }) => Promise<PageSummary[]>;
  notesTreeDataReady: boolean;
  dirtyPageIds: string[];
  notesTreePages: PageSummary[];
  openTabs: PageDetail[];
  runWithSelectionLoading: RunWithSelectionLoading;
  selectedPage: PageDetail | null;
  setActiveSourceNodeId: (value: string | null) => void;
  setActiveTreeSelectionKind: (value: ActiveTreeSelectionKind) => void;
  setEditorDrafts: (
    value: Record<string, string> | ((current: Record<string, string>) => Record<string, string>),
  ) => void;
  setOpenTabs: (value: PageDetail[] | ((current: PageDetail[]) => PageDetail[])) => void;
  setSelectedPage: (value: PageDetail | null) => void;
  setSelectionErrorMessage: (message: string) => void;
  setSelectionNoticeMessage: (message: string) => void;
  notesScopeKey: string;
};

export function useDesktopSelectionGraphScopes({
  activeTreeSelectionKind,
  activeSource,
  bridgeBaseUrl,
  graphCacheNamespace,
  graphDepth,
  graphMode,
  graphScope,
  getSourceRootPages,
  notesTreeDataReady,
  dirtyPageIds,
  notesTreePages,
  openTabs,
  runWithSelectionLoading,
  selectedPage,
  setActiveSourceNodeId,
  setActiveTreeSelectionKind,
  setEditorDrafts,
  setOpenTabs,
  setSelectedPage,
  setSelectionErrorMessage,
  setSelectionNoticeMessage,
  notesScopeKey,
}: UseDesktopSelectionGraphScopesParams) {
  const {
    loadSelectedPage,
    openSelectedPage,
    previewSelectedPageInSmartFolder,
    refreshOpenPageInPlace,
    refreshPageGraph,
  } = useDesktopSelectionPageScopes({
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
      selectedPageId: selectedPage?.id ?? null,
      notesScopeKey,
    });
  const {
    buildActivePreset,
    clearSmartFolderScope,
    loadSmartFolderGraphById,
    loadSmartFolderScope,
    loadNotesScope,
    loadSourceScope,
    selectSourceNode,
    setScopeFilterOptions,
  } = useDesktopScopeLoaders({
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
  });

  const selectPageWithCurrentMode = useCallback(
    async (
      pageId: string,
      options?: {
        pageDetail?: PageDetail;
        baseUrl?: string;
        tabDisposition?: PageOpenDisposition;
      },
    ) => {
      if (graphScope?.kind === "source" && activeSource) {
        if (
          activeSource.kind !== "shared-base" &&
          activeSource.kind !== "managed-base"
        ) {
          await selectSourceNode(activeSource, pageId);
          return;
        }
        if (graphMode === "frozen") {
          await openSelectedPage(pageId, { ...options, treeSelectionKind: null });
          await selectSourceNode(activeSource, pageId);
          return;
        }
        await loadSelectedPage(pageId, options);
        return;
      }
      if (!graphScope) {
        await loadSelectedPage(pageId, options);
        return;
      }
      if (graphScope.kind === "page") {
        if (graphMode === "frozen") {
          await openSelectedPage(pageId, { ...options, treeSelectionKind: "page" });
          return;
        }
        await loadSelectedPage(pageId, options);
        return;
      }

      if (graphScope.kind === "smart-folder") {
        if (graphMode === "frozen") {
          await openSelectedPage(pageId, {
            ...options,
            treeSelectionKind: "smart-folder",
          });
          return;
        }
        await previewSelectedPageInSmartFolder(pageId, options);
        return;
      }

      await openSelectedPage(pageId, { ...options, treeSelectionKind: null });
    },
    [
      activeSource,
      graphMode,
      graphScope,
      loadSelectedPage,
      loadSourceScope,
      openSelectedPage,
      previewSelectedPageInSmartFolder,
      selectSourceNode,
    ],
  );

  const refreshGraphFromCurrentScope = useCallback(async () => {
    if (!graphScope) {
      return;
    }

    if (graphScope.kind === "page") {
      await refreshPageGraph(graphScope.id);
      return;
    }

    if (graphScope.kind === "source") {
      if (!activeSource) {
        return;
      }
      await loadSourceScope(activeSource, {
        activeNodeId: graphScope.id,
        forceRefresh: true,
      });
      return;
    }

    if (graphScope.kind === "smart-folder") {
      await loadSmartFolderGraphById(graphScope.presetId, { forceRefresh: true });
      return;
    }

    await loadNotesScope({ forceRefresh: true });
  }, [activeSource, graphScope, loadSmartFolderGraphById, loadNotesScope, loadSourceScope, refreshPageGraph]);

  const rebuildGraphFromCurrentSelection = useCallback(async () => {
    if (selectedPage?.id && activeTreeSelectionKind === "page") {
      await loadSelectedPage(selectedPage.id, { pageDetail: selectedPage });
      return;
    }

    if (activeTreeSelectionKind === "notes") {
      if (activeSource) {
        await loadSourceScope(activeSource, { forceRefresh: true });
        return;
      }
      await loadNotesScope({ forceRefresh: true });
    }

    if (graphScope?.kind === "smart-folder" && activeTreeSelectionKind === "smart-folder") {
      const { activePresetId } = useGraphFiltersStore.getState();
      if (!activePresetId || graphScope.presetId !== activePresetId) {
        return;
      }
      await loadSmartFolderGraphById(graphScope.presetId, { forceRefresh: true });
    }
  }, [
    activeTreeSelectionKind,
    graphScope,
    activeSource,
    loadSmartFolderGraphById,
    loadSelectedPage,
    loadNotesScope,
    loadSourceScope,
    selectedPage,
  ]);

  return {
    buildActivePreset,
    clearSmartFolderScope,
    loadSelectedPage,
    loadSmartFolderGraphById,
    loadSmartFolderScope,
    loadNotesScope,
    loadSourceScope,
    openSelectedPage,
    refreshOpenPageInPlace,
    rebuildGraphFromCurrentSelection,
    refreshGraphFromCurrentScope,
    refreshPageGraph,
    selectPageWithCurrentMode,
    selectSourceNode,
    setScopeFilterOptions,
  };
}
