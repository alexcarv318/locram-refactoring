import { useEffect, useRef } from "react";

import { isTagNodeId } from "@/lib/graph/tag-nodes";
import { setOptionsFromNodes, useGraphFiltersStore } from "@/stores/graphFiltersStore";
import { useGraphStore } from "@/stores/graphStore";
import type { GraphScope } from "@/stores/graphStore";
import type { ActiveTreeSelectionKind } from "@/components/shell/desktopShellContext";
import type { PageDetail, PageSummary } from "@/types";
import type { ActiveSource } from "@/types/source";
import type { FilterPreset } from "@/lib/graph/filter-state/index";
import type { PageOpenDisposition } from "@/lib/pageOpenTabs";

type UseDesktopSelectionEffectsParams = {
  activeSource: ActiveSource | null;
  activeTreeSelectionKind: ActiveTreeSelectionKind;
  bridgeBaseUrlPending: boolean;
  graphDepth: number;
  graphMode: "synced" | "frozen";
  graphScope: GraphScope;
  handleSelectPage: (
    pageId: string,
    options?: { tabDisposition?: PageOpenDisposition },
  ) => Promise<void>;
  loadSmartFolderGraphById: (presetId: string, options?: { baseUrl?: string }) => Promise<void>;
  loadNotesScope: (options?: { baseUrl?: string }) => Promise<void>;
  loadSourceScope: (source: ActiveSource, options?: { activeNodeId?: string | null }) => Promise<void>;
  isCreatingNote: boolean;
  notesTreeDataReady: boolean;
  notesTreePages: PageSummary[];
  notesTreePending: boolean;
  rebuildGraphFromCurrentSelection: () => Promise<void>;
  rebuildGraphFromSelectionRequestId: number;
  refreshGraphFromCurrentScope: () => Promise<void>;
  refreshGraphRequestId: number;
  refreshPageGraph: (pageId: string, options?: { baseUrl?: string }) => Promise<void>;
  requestedPageSelectionId: string | null;
  resetPageHistory: () => void;
  setScopeFilterOptions: (preset?: FilterPreset | null) => void;
  selectSourceNode: (source: ActiveSource, nodeId: string) => Promise<void>;
  selectedPage: PageDetail | null;
  selectionErrorMessage: string;
  setEditorDrafts: (
    value: Record<string, string> | ((current: Record<string, string>) => Record<string, string>),
  ) => void;
  setIsCreatingNote: (value: boolean) => void;
  setOpenTabs: (value: PageDetail[] | ((current: PageDetail[]) => PageDetail[])) => void;
  setSelectedPage: (value: PageDetail | null) => void;
  setPendingCloseTabId: (value: string | null) => void;
  notesScopeKey: string;
};

export function useDesktopSelectionEffects({
  activeSource,
  activeTreeSelectionKind,
  bridgeBaseUrlPending,
  graphDepth,
  graphMode,
  graphScope,
  handleSelectPage,
  loadSmartFolderGraphById,
  loadNotesScope,
  loadSourceScope,
  isCreatingNote,
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
  setScopeFilterOptions,
  selectSourceNode,
  selectedPage,
  setEditorDrafts,
  setIsCreatingNote,
  setOpenTabs,
  setSelectedPage,
  setPendingCloseTabId,
  notesScopeKey,
}: UseDesktopSelectionEffectsParams) {
  const previousGraphDepthRef = useRef(graphDepth);
  const previousGraphModeRef = useRef(graphMode);
  const handledRefreshGraphRequestIdRef = useRef(0);
  const handledRebuildGraphFromSelectionRequestIdRef = useRef(0);
  const initialSelectionHydratedRef = useRef(false);
  const initialSelectionPendingRef = useRef(false);
  const previousNotesScopeKeyRef = useRef(notesScopeKey);

  useEffect(() => {
    if (previousNotesScopeKeyRef.current === notesScopeKey) {
      return;
    }
    previousNotesScopeKeyRef.current = notesScopeKey;
    initialSelectionHydratedRef.current = false;
    initialSelectionPendingRef.current = false;
  }, [notesScopeKey]);

  useEffect(() => {
    if (initialSelectionHydratedRef.current) {
      return;
    }

    if (
      bridgeBaseUrlPending ||
      notesTreePending ||
      activeSource !== null
    ) {
      return;
    }

    if (selectedPage?.id) {
      initialSelectionHydratedRef.current = true;
      initialSelectionPendingRef.current = false;
      return;
    }

    if (notesTreePages.length === 0) {
      return;
    }

    if (initialSelectionPendingRef.current) {
      return;
    }

    initialSelectionPendingRef.current = true;
    void handleSelectPage(notesTreePages[0].id).finally(() => {
      initialSelectionPendingRef.current = false;
    });
  }, [
    activeSource,
    bridgeBaseUrlPending,
    handleSelectPage,
    notesTreePages,
    notesTreePending,
    selectedPage?.id,
  ]);

  useEffect(() => {
    if (previousGraphDepthRef.current === graphDepth) {
      return;
    }

    previousGraphDepthRef.current = graphDepth;
    if (!graphScope) {
      return;
    }

    void refreshGraphFromCurrentScope();
  }, [graphDepth, graphScope, refreshGraphFromCurrentScope]);

  useEffect(() => {
    if (!requestedPageSelectionId) {
      return;
    }

    const requestedDisposition = useGraphStore.getState().requestedPageOpenDisposition;

    if (graphScope?.kind === "source" && activeSource) {
      useGraphStore.getState().clearRequestedPageSelection();
      if (
        activeSource.kind === "shared-base" ||
        activeSource.kind === "managed-base"
      ) {
        void handleSelectPage(requestedPageSelectionId, {
          tabDisposition: requestedDisposition,
        });
      } else {
        void selectSourceNode(activeSource, requestedPageSelectionId);
      }
      return;
    }

    if (requestedPageSelectionId === selectedPage?.id) {
      useGraphStore.getState().clearRequestedPageSelection();
      return;
    }

    if (isTagNodeId(requestedPageSelectionId)) {
      useGraphStore.getState().clearRequestedPageSelection();
      return;
    }

    useGraphStore.getState().clearRequestedPageSelection();
    void handleSelectPage(requestedPageSelectionId, {
      tabDisposition: requestedDisposition,
    });
  }, [
    activeSource,
    graphScope?.kind,
    handleSelectPage,
    requestedPageSelectionId,
    selectSourceNode,
    selectedPage?.id,
  ]);

  useEffect(() => {
    if (refreshGraphRequestId <= handledRefreshGraphRequestIdRef.current) {
      return;
    }

    handledRefreshGraphRequestIdRef.current = refreshGraphRequestId;
    void refreshGraphFromCurrentScope();
  }, [refreshGraphFromCurrentScope, refreshGraphRequestId]);

  useEffect(() => {
    if (rebuildGraphFromSelectionRequestId <= handledRebuildGraphFromSelectionRequestIdRef.current) {
      return;
    }

    handledRebuildGraphFromSelectionRequestIdRef.current = rebuildGraphFromSelectionRequestId;
    void rebuildGraphFromCurrentSelection();
  }, [rebuildGraphFromCurrentSelection, rebuildGraphFromSelectionRequestId]);

  useEffect(() => {
    const previousMode = previousGraphModeRef.current;
    previousGraphModeRef.current = graphMode;

    if (previousMode !== "frozen" || graphMode !== "synced") {
      return;
    }

    if (selectedPage?.id && activeTreeSelectionKind === "page") {
      void refreshPageGraph(selectedPage.id);
      return;
    }

    if (activeTreeSelectionKind === "notes") {
      if (activeSource) {
        void loadSourceScope(activeSource);
        return;
      }
      void loadNotesScope();
      return;
    }

    if (graphScope?.kind === "smart-folder" && activeTreeSelectionKind === "smart-folder") {
      const { activePresetId } = useGraphFiltersStore.getState();
      if (!activePresetId || activePresetId !== graphScope.presetId) {
        return;
      }
      void loadSmartFolderGraphById(graphScope.presetId);
    }
  }, [
    activeTreeSelectionKind,
    activeSource,
    graphMode,
    graphScope,
    loadSmartFolderGraphById,
    loadNotesScope,
    loadSourceScope,
    refreshPageGraph,
    selectedPage?.id,
  ]);

  useEffect(() => {
    if (bridgeBaseUrlPending || notesTreePending || !notesTreeDataReady) {
      return;
    }

    if (activeTreeSelectionKind !== "notes") {
      return;
    }

    if (activeSource && activeSource.kind !== "local-base") {
      return;
    }

    setScopeFilterOptions();
  }, [
    activeTreeSelectionKind,
    activeSource,
    bridgeBaseUrlPending,
    notesTreeDataReady,
    notesTreePages,
    notesTreePending,
    setScopeFilterOptions,
  ]);

  useEffect(() => {
    if (bridgeBaseUrlPending || notesTreePending || !notesTreeDataReady) {
      return;
    }

    if (activeSource) {
      return;
    }

    if (notesTreePages.length === 0) {
      setOpenTabs([]);
      setSelectedPage(null);
      resetPageHistory();
      useGraphStore.getState().resetGraphState();
      setOptionsFromNodes([]);
      if (!isCreatingNote) {
        setIsCreatingNote(false);
      }
      setEditorDrafts({});
      setPendingCloseTabId(null);
      return;
    }
  }, [
    bridgeBaseUrlPending,
    activeSource,
    isCreatingNote,
    notesTreeDataReady,
    notesTreePages,
    notesTreePending,
    resetPageHistory,
    setEditorDrafts,
    setIsCreatingNote,
    setOpenTabs,
    setPendingCloseTabId,
    setSelectedPage,
  ]);
}
