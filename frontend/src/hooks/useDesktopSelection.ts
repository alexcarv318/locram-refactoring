import { useCallback, useState } from "react";

import { setOptionsFromNodes, useGraphFiltersStore } from "@/stores/graphFiltersStore";
import { useGraphStore } from "@/stores/graphStore";
import { useSourcesToolbarStore } from "@/stores/sourcesToolbarStore";
import {
  planCloseAllFileTabs,
  planCloseOtherFileTabs,
} from "@/lib/application/editorFileTabCommands";
import type { PageOpenDisposition } from "@/lib/pageOpenTabs";
import type { PageDetail, PageSummary } from "@/types";
import type { ActiveSource } from "@/types/source";
import { useDesktopPageHistory } from "./useDesktopPageHistory";
import { useDesktopSelectionEffects } from "./useDesktopSelectionEffects";
import { useDesktopSelectionGraphScopes } from "./useDesktopSelectionGraphScopes";
import type { DesktopShellState } from "./useDesktopShellState";

type UseDesktopSelectionParams = {
  bridgeBaseUrl: string;
  bridgeBaseUrlPending: boolean;
  graphCacheNamespace: string;
  getSourceRootPages: (source: ActiveSource, options?: { forceRefresh?: boolean }) => Promise<PageSummary[]>;
  notesTreeDataReady: boolean;
  notesTreePages: PageSummary[];
  notesTreePending: boolean;
  shellState: DesktopShellState;
  notesScopeKey: string;
};

type SelectionLoadingMode = "blocking" | "refresh";

export function useDesktopSelection({
  bridgeBaseUrl,
  bridgeBaseUrlPending,
  graphCacheNamespace,
  getSourceRootPages,
  notesTreeDataReady,
  notesTreePages,
  notesTreePending,
  shellState,
  notesScopeKey,
}: UseDesktopSelectionParams) {
  const requestedPageSelectionId = useGraphStore((state) => state.requestedPageSelectionId);
  const graphMode = useGraphStore((state) => state.graphMode);
  const graphScope = useGraphStore((state) => state.graphScope);
  const refreshGraphRequestId = useGraphStore((state) => state.refreshGraphRequestId);
  const rebuildGraphFromSelectionRequestId = useGraphStore((state) => state.rebuildGraphFromSelectionRequestId);
  const graphDepth = useSourcesToolbarStore((state) => state.graphDepth);
  const {
    activeSource,
    activeTreeSelectionKind,
    dirtyPageIds,
    isCreatingNote,
    openTabs,
    pendingCloseTabId,
    selectedPage,
    selectionErrorMessage,
    setActiveSourceNodeId,
    setActiveTreeSelectionKind,
    setEditorDrafts,
    setIsCreatingNote,
    setOpenTabs,
    setPendingCloseTabId,
    setSelectedPage,
    setSelectionErrorMessage,
    setSelectionNoticeMessage,
  } = shellState;

  const [selectionLoadCount, setSelectionLoadCount] = useState(0);
  const [graphRefreshLoadCount, setGraphRefreshLoadCount] = useState(0);

  const runWithSelectionLoading = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      mode: SelectionLoadingMode = "blocking",
    ): Promise<T> => {
      const setCounter = mode === "blocking" ? setSelectionLoadCount : setGraphRefreshLoadCount;
      setCounter((current) => current + 1);
      try {
        return await operation();
      } finally {
        setCounter((current) => Math.max(0, current - 1));
      }
    },
    [],
  );

  const {
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
  } = useDesktopSelectionGraphScopes({
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
  });

  const {
    canGoBackInPageHistory,
    canGoForwardInPageHistory,
    commitHistoryAfterNavigation,
    goBackInPageHistory,
    goForwardInPageHistory,
    resetPageHistory,
  } = useDesktopPageHistory({
    openTabs,
    selectPageWithCurrentMode,
    setSelectionErrorMessage,
  });

  const handleSelectPage = useCallback(
    async (pageId: string, options?: { tabDisposition?: PageOpenDisposition }) => {
      if (!bridgeBaseUrl || pageId === selectedPage?.id) {
        return;
      }

      setSelectionErrorMessage("");
      try {
        if (activeSource?.kind === "shared-base") {
          setActiveSourceNodeId(pageId);
        }
        const existingTab = openTabs.find((tab) => tab.id === pageId);
        await selectPageWithCurrentMode(pageId, {
          ...(existingTab ? { pageDetail: existingTab } : {}),
          tabDisposition: options?.tabDisposition,
        });
        commitHistoryAfterNavigation(pageId);
      } catch (error) {
        setSelectionErrorMessage(error instanceof Error ? error.message : "Could not load note.");
      }
    },
    [
      bridgeBaseUrl,
      commitHistoryAfterNavigation,
      openTabs,
      selectedPage?.id,
      selectPageWithCurrentMode,
      activeSource,
      setActiveSourceNodeId,
      setSelectionErrorMessage,
    ],
  );

  const closeTabImmediately = useCallback(
    async (pageId: string) => {
      const closingActiveTab = selectedPage?.id === pageId;
      let remainingTabs: PageDetail[] = [];
      let closingTabIndex = -1;

      setOpenTabs((currentTabs) => {
        closingTabIndex = currentTabs.findIndex((tab) => tab.id === pageId);
        remainingTabs = currentTabs.filter((tab) => tab.id !== pageId);
        return remainingTabs;
      });

      setEditorDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[pageId];
        return nextDrafts;
      });

      if (!closingActiveTab) {
        return;
      }

      if (remainingTabs.length === 0) {
        setSelectedPage(null);
        useGraphStore.getState().resetGraphState();
        setOptionsFromNodes([]);
        return;
      }

      const fallbackIndex = Math.max(0, closingTabIndex - 1);
      const fallbackTab = remainingTabs[Math.min(fallbackIndex, remainingTabs.length - 1)];

      setSelectionErrorMessage("");
      try {
        await selectPageWithCurrentMode(fallbackTab.id, { pageDetail: fallbackTab });
      } catch (error) {
        setSelectionErrorMessage(error instanceof Error ? error.message : "Could not load note.");
      }
    },
    [
      selectedPage?.id,
      selectPageWithCurrentMode,
      setEditorDrafts,
      setOpenTabs,
      setSelectedPage,
      setSelectionErrorMessage,
    ],
  );

  const handleCloseTab = useCallback(
    async (pageId: string) => {
      if (dirtyPageIds.includes(pageId)) {
        setPendingCloseTabId(pageId);
        return;
      }

      await closeTabImmediately(pageId);
    },
    [closeTabImmediately, dirtyPageIds, setPendingCloseTabId],
  );

  const closeOtherFileTabs = useCallback(
    async (...keepPageIds: string[]) => {
      const plan = planCloseOtherFileTabs(openTabs, keepPageIds, dirtyPageIds);
      if (!plan) {
        return;
      }

      if (plan.cleanTabsToClose.length === 0) {
        if (plan.dirtyTabsRemaining.length > 0) {
          setPendingCloseTabId(plan.dirtyTabsRemaining[0].id);
        }
        return;
      }

      const keepIds = new Set(keepPageIds.filter((pageId) => pageId.length > 0));

      setOpenTabs(plan.nextOpenTabs);
      setEditorDrafts((current) => {
        const nextDrafts = { ...current };
        for (const tab of plan.cleanTabsToClose) {
          delete nextDrafts[tab.id];
        }
        return nextDrafts;
      });

      const closedActivePage =
        selectedPage !== null &&
        plan.cleanTabsToClose.some((tab) => tab.id === selectedPage.id);

      if (closedActivePage) {
        const nextActiveTab =
          plan.nextOpenTabs.find((tab) => keepIds.has(tab.id)) ??
          plan.nextOpenTabs.find((tab) => dirtyPageIds.includes(tab.id)) ??
          null;

        if (nextActiveTab) {
          setSelectionErrorMessage("");
          try {
            await selectPageWithCurrentMode(nextActiveTab.id, { pageDetail: nextActiveTab });
          } catch (error) {
            setSelectionErrorMessage(
              error instanceof Error ? error.message : "Could not load note.",
            );
          }
        } else {
          setSelectedPage(null);
          useGraphStore.getState().resetGraphState();
          setOptionsFromNodes([]);
        }
      }

      if (plan.dirtyTabsRemaining.length > 0) {
        setPendingCloseTabId(plan.dirtyTabsRemaining[0].id);
      }
    },
    [
      dirtyPageIds,
      openTabs,
      selectPageWithCurrentMode,
      selectedPage,
      setEditorDrafts,
      setOpenTabs,
      setPendingCloseTabId,
      setSelectedPage,
      setSelectionErrorMessage,
    ],
  );

  const closeAllFileTabs = useCallback(async () => {
    const plan = planCloseAllFileTabs(openTabs, dirtyPageIds);

    setEditorDrafts((current) => {
      const nextDrafts = { ...current };
      for (const tab of plan.cleanTabsToClose) {
        delete nextDrafts[tab.id];
      }
      return nextDrafts;
    });

    setOpenTabs(plan.nextOpenTabs);

    const closedActivePage =
      selectedPage !== null &&
      plan.cleanTabsToClose.some((tab) => tab.id === selectedPage.id);

    if (closedActivePage) {
      if (plan.dirtyTabsRemaining.length > 0) {
        setSelectionErrorMessage("");
        try {
          await selectPageWithCurrentMode(plan.dirtyTabsRemaining[0].id, {
            pageDetail: plan.dirtyTabsRemaining[0],
          });
        } catch (error) {
          setSelectionErrorMessage(
            error instanceof Error ? error.message : "Could not load note.",
          );
        }
      } else {
        setSelectedPage(null);
        useGraphStore.getState().resetGraphState();
        setOptionsFromNodes([]);
      }
    } else if (plan.dirtyTabsRemaining.length === 0) {
      setSelectedPage(null);
      useGraphStore.getState().resetGraphState();
      setOptionsFromNodes([]);
    }

    if (plan.dirtyTabsRemaining.length > 0) {
      setPendingCloseTabId(plan.dirtyTabsRemaining[0].id);
    }
  }, [
    dirtyPageIds,
    openTabs,
    selectPageWithCurrentMode,
    selectedPage,
    setEditorDrafts,
    setOpenTabs,
    setPendingCloseTabId,
    setSelectedPage,
    setSelectionErrorMessage,
  ]);

  useDesktopSelectionEffects({
    activeSource,
    activeTreeSelectionKind,
    bridgeBaseUrlPending,
    graphDepth,
    graphMode,
    graphScope,
    handleSelectPage,
    isCreatingNote,
    loadSmartFolderGraphById,
    loadNotesScope,
    loadSourceScope,
    notesTreeDataReady,
    notesTreePages,
    notesTreePending,
    rebuildGraphFromCurrentSelection,
    rebuildGraphFromSelectionRequestId,
    refreshGraphFromCurrentScope,
    refreshGraphRequestId,
    refreshPageGraph,
    requestedPageSelectionId,
    resetPageHistory,
    selectSourceNode,
    selectedPage,
    selectionErrorMessage,
    setEditorDrafts,
    setIsCreatingNote,
    setOpenTabs,
    setScopeFilterOptions,
    setSelectedPage,
    setPendingCloseTabId,
    notesScopeKey,
  });

  return {
    canGoBackInPageHistory,
    canGoForwardInPageHistory,
    closeAllFileTabs,
    closeOtherFileTabs,
    closeTabImmediately,
    goBackInPageHistory,
    goForwardInPageHistory,
    handleCloseTab,
    handleSelectPage,
    isGraphRefreshLoading: graphRefreshLoadCount > 0,
    isSelectionLoading: selectionLoadCount > 0,
    clearSmartFolderScope,
    loadSmartFolderScope,
    openSelectedPage,
    refreshOpenPageInPlace,
    loadSelectedPage,
    refreshPageGraph,
    loadNotesScope,
    loadSourceScope,
    resetPageHistory,
    selectSourceNode,
  };
}
