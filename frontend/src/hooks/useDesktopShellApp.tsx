import { useEffect, useRef } from "react";

import type {
  ActivateSourceOptions,
  DesktopShellContextValue,
} from "@/components/shell/desktopShellContext";
import { useDesktopBridgeData } from "@/hooks/useDesktopBridgeData";
import { useDesktopDataFreshness } from "@/hooks/useDesktopDataFreshness";
import { useDesktopMutations } from "@/hooks/useDesktopMutations";
import { useDesktopSelection } from "@/hooks/useDesktopSelection";
import { useDesktopShellState } from "@/hooks/useDesktopShellState";
import { useDesktopShellViewModel } from "@/hooks/useDesktopShellViewModel";
import { useThinClientRecovery, type ThinClientRecoveryBanner } from "@/hooks/useThinClientRecovery";
import { useDesktopWindowCloseGuard } from "@/hooks/useDesktopWindowCloseGuard";
import { useDesktopWorkspaceLayout } from "@/hooks/useDesktopWorkspaceLayout";
import { useEditorTabsProjection } from "@/hooks/useEditorTabsProjection";
import { SOURCE_INSPECT_TAB_ID, useEditorStore } from "@/stores/editorStore";
import { useGraphFiltersStore } from "@/stores/graphFiltersStore";
import { useGraphStore } from "@/stores/graphStore";
import { defaultSourceNodeId } from "@/types/source";
import type { ShellTab } from "@/types/ShellTab";

type UseDesktopShellAppResult = {
  activeBaseLabel: string | undefined;
  canGoBackInPageHistory: boolean;
  canGoForwardInPageHistory: boolean;
  errorMessage: string;
  layoutTabs: ShellTab[];
  noticeMessage: string;
  onCancelWindowClose: () => void;
  onConfirmWindowCloseDiscard: () => Promise<void>;
  onConfirmWindowCloseSave: () => Promise<void>;
  onGoBackInPageHistory: () => Promise<void>;
  onGoForwardInPageHistory: () => Promise<void>;
  onSearch: (
    query: string,
  ) => Promise<
    {
      id: string;
      path: string;
      title: string;
      type: "note" | "document";
      updated_at: string;
    }[]
  >;
  onSelectSearchItem: (item: { id: string }) => void;
  pendingCloseTabId: string | null;
  recoveryBanner: ThinClientRecoveryBanner | null;
  shellContextValue: DesktopShellContextValue;
  windowClosePending: boolean;
};

export function useDesktopShellApp(): UseDesktopShellAppResult {
  const graphMode = useGraphStore((state) => state.graphMode);
  const { layoutTabs } = useDesktopWorkspaceLayout();
  const shellState = useDesktopShellState();
  const activeTabId = useEditorStore((state) => state.activeTabId);
  const closeSource = useEditorStore((state) => state.closeSource);
  const openSource = useEditorStore((state) => state.openSource);
  const setActiveTab = useEditorStore((state) => state.setActiveTab);
  const editorTabs = useEditorStore((state) => state.tabs);
  const {
    activeSource,
    activeSourceNodeId,
    activeTreeSelectionKind,
    clearAllExternalUpdatePending,
    clearExternalUpdatePending,
    dirtyPageIds,
    editorDrafts,
    externalUpdatePendingPageIds,
    markExternalUpdatePending,
    openTabs,
    selectedPage,
    setActiveSource,
    setActiveSourceNodeId,
    setEditorDrafts,
    clearSelectionFeedback,
    setWindowClosePending,
    windowClosePending,
  } = shellState;
  const activeSourceIdRef = useRef<string | null>(activeSource?.id ?? null);
  const activeSourceNodeIdRef = useRef<string | null>(activeSourceNodeId ?? null);

  useEffect(() => {
    activeSourceIdRef.current = activeSource?.id ?? null;
  }, [activeSource]);

  useEffect(() => {
    activeSourceNodeIdRef.current = activeSourceNodeId ?? null;
  }, [activeSourceNodeId]);

  const bridgeData = useDesktopBridgeData(activeSource);
  const {
    activeBaseEntryId,
    bootstrapQuery,
    bridgeBaseUrl,
    bridgeBaseUrlQuery,
    getSourceRootPages,
    notesTreePages,
    notesTreeQuery,
    refreshNotesCaches,
    workingBaseScopeKey,
    notesScopeKey,
  } = bridgeData;
  const notesTreeDataReady = notesTreeQuery.data !== undefined;
  const recoveryBanner = useThinClientRecovery({
    bootstrap: bootstrapQuery.data,
    bridgeBaseUrl,
  });

  const {
    canGoBackInPageHistory,
    canGoForwardInPageHistory,
    clearSmartFolderScope,
    closeAllFileTabs,
    closeOtherFileTabs,
    closeTabImmediately,
    goBackInPageHistory,
    goForwardInPageHistory,
    handleCloseTab,
    handleSelectPage,
    isGraphRefreshLoading,
    isSelectionLoading,
    openSelectedPage,
    refreshOpenPageInPlace,
    loadSelectedPage,
    loadSmartFolderScope,
    loadNotesScope,
    loadSourceScope,
    resetPageHistory,
    refreshPageGraph,
    selectSourceNode,
  } = useDesktopSelection({
    bridgeBaseUrl,
    bridgeBaseUrlPending: bridgeBaseUrlQuery.isPending,
    graphCacheNamespace: notesScopeKey,
    getSourceRootPages,
    notesTreeDataReady,
    notesTreePages,
    notesTreePending: notesTreeQuery.isPending,
    shellState,
    notesScopeKey,
  });

  const currentWorkingBaseKey = workingBaseScopeKey;

  useEffect(() => {
    useGraphFiltersStore.getState().setScopeKey(workingBaseScopeKey);
  }, [workingBaseScopeKey]);

  const {
    createNoteMutation,
    deleteNoteMutation,
    handleSavePageContent,
    renameNoteMutation,
    savePageMutation,
  } = useDesktopMutations({
    activeBaseEntryId,
    activeSource,
    activeTreeSelectionKind,
    bridgeBaseUrl,
    openSelectedPage,
    loadSelectedPage,
    refreshPageGraph,
    shellState,
  });

  useEditorTabsProjection({
    dirtyPageIds,
    externalUpdatePendingPageIds,
    openTabs,
    selectedPageId: selectedPage?.id ?? null,
  });

  useDesktopDataFreshness({
    activeSource,
    activeTreeSelectionKind,
    bridgeBaseUrl,
    graphCacheNamespace: notesScopeKey,
    notesScopeKey,
    refreshOpenPageInPlace,
    graphMode,
    refreshNotesCaches,
    selectedPageId: selectedPage?.id ?? null,
    dirtyPageIds,
    externalUpdatePendingPageIds,
    markExternalUpdatePending,
    clearExternalUpdatePending,
    clearAllExternalUpdatePending,
  });

  const {
    onCancelWindowClose,
    onConfirmWindowCloseDiscard,
    onConfirmWindowCloseSave,
  } = useDesktopWindowCloseGuard({
    dirtyPageIds,
    onDiscardAllDirtyPages: () => {
      setEditorDrafts({});
    },
    onSaveAllDirtyPages: async () => {
      const results = await Promise.all(
        dirtyPageIds.map((pageId) => handleSavePageContent(pageId)),
      );
      return results.every(Boolean);
    },
    setWindowClosePending,
  });

  const handleActivateSource = async (
    source: Parameters<typeof openSource>[0],
    options?: ActivateSourceOptions,
  ) => {
    const previouslyActiveTabId = activeTabId;
    const previouslyActiveTab =
      previouslyActiveTabId === null
        ? null
        : editorTabs.find((tab) => tab.id === previouslyActiveTabId) ?? null;
    const isSourceTransition = activeSourceIdRef.current !== source.id;
    const nextWorkingBaseKey =
      source.kind === "local-base"
        ? `local-base:${source.entryId}`
        : source.kind === "managed-base"
          ? source.baseRef
        : source.kind === "shared-base"
          ? `shared-base:${source.grantId}`
          : null;
    const shouldResetForWorkingBaseTransition =
      nextWorkingBaseKey !== null && nextWorkingBaseKey !== currentWorkingBaseKey;
    const shouldPreserveCurrentTab =
      options?.preserveCurrentTab === true && previouslyActiveTab?.tabType !== "file";
    const shouldShowSourceTab = options?.showSourceTab !== false;
    const isActivatingFromInspectTab =
      previouslyActiveTab?.tabType === "source" &&
      previouslyActiveTab.sourceContext?.mode === "inspect" &&
      previouslyActiveTab.sourceContext.source.id === source.id;
    const shouldKeepInspectTabOpen =
      shouldPreserveCurrentTab && isActivatingFromInspectTab;

    clearSelectionFeedback();
    if (shouldResetForWorkingBaseTransition) {
      shellState.setOpenTabs([]);
      shellState.setSelectedPage(null);
      shellState.setEditorDrafts({});
      shellState.setPendingCloseTabId(null);
      resetPageHistory();
      useGraphStore.getState().clearRequestedPageSelection();
    } else {
      shellState.setSelectedPage(null);
    }
    shellState.setActiveSource(source);
    activeSourceIdRef.current = source.id;
    const selectedNodeId = defaultSourceNodeId(source);
    shellState.setActiveSourceNodeId(selectedNodeId);
    activeSourceNodeIdRef.current = selectedNodeId;
    if (!shouldShowSourceTab) {
      closeSource();
    } else {
      if (!shouldKeepInspectTabOpen) {
        openSource(source, { selectedNodeId });
      }
      if (shouldPreserveCurrentTab && previouslyActiveTabId) {
        setActiveTab(previouslyActiveTabId);
      }
      if (!shouldKeepInspectTabOpen && isActivatingFromInspectTab) {
        closeSource(SOURCE_INSPECT_TAB_ID);
      }
    }
    await loadSourceScope(source, {
      activeNodeId: selectedNodeId,
      forceRefresh: options?.forceRefresh === true,
      loadingMode: "refresh",
      shouldApply: () =>
        activeSourceIdRef.current === source.id &&
        activeSourceNodeIdRef.current === selectedNodeId,
    });
  };

  const handleSelectNotesScope = async () => {
    if (activeSource) {
      await handleActivateSource(activeSource, { showSourceTab: false });
      return;
    }
    await loadNotesScope();
  };

  const handleSelectSourceNode = async (nodeId: string) => {
    if (!activeSource) {
      return;
    }
    shellState.setActiveSourceNodeId(nodeId);
    if (activeSource.kind !== "shared-base") {
      openSource(activeSource, { selectedNodeId: nodeId });
    }
    await selectSourceNode(activeSource, nodeId);
  };

  const viewModel = useDesktopShellViewModel({
    bridgeData: {
      bootstrapQuery,
      bridgeBaseUrlQuery,
      notesTreeDataReady,
      notesTreePages,
      notesTreeQuery,
    },
    isGraphRefreshLoading,
    handlers: {
      closeAllFileTabs,
      closeOtherFileTabs,
      closeTabImmediately,
      clearSmartFolderScope,
      handleActivateSource,
      handleCloseTab,
      handleSavePageContent,
      handleSelectNotesScope,
      handleSelectPage,
      loadSmartFolderScope,
      loadNotesScope,
      handleSelectSourceNode,
    },
    isSelectionLoading,
    layoutTabs,
    mutations: {
      createNoteMutation,
      deleteNoteMutation,
      renameNoteMutation,
      savePageMutation,
    },
    shellState,
    notesScopeKey,
  });

  return {
    ...viewModel,
    activeBaseLabel: viewModel.activeBaseLabel,
    canGoBackInPageHistory,
    canGoForwardInPageHistory,
    onCancelWindowClose,
    onConfirmWindowCloseDiscard,
    onConfirmWindowCloseSave,
    onGoBackInPageHistory: goBackInPageHistory,
    onGoForwardInPageHistory: goForwardInPageHistory,
    onSearch: viewModel.onSearch,
    pendingCloseTabId: viewModel.pendingCloseTabId,
    recoveryBanner,
    windowClosePending,
  };
}
