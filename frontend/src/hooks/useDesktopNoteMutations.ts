import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

import { createPage, deletePage, updatePage } from "@/api";
import { isEditorMarkdownEquivalent } from "@/components/editor/markdownInterop";
import { resolveContentSaveGraphRefreshAction } from "@/lib/application/contentSaveGraphRefresh";
import { workingBaseMutationOptions } from "@/lib/workingBaseReadOptions";
import type { ActiveTreeSelectionKind } from "@/components/shell/desktopShellContext";
import { setOptionsFromNodes } from "@/stores/graphFiltersStore";
import { useGraphStore } from "@/stores/graphStore";
import type { PageDetail } from "@/types";
import type { GraphResponseNode } from "@/types/graph/Graph";
import type { ActiveSource } from "@/types/source";

type NoteSelectionLoader = (
  pageId: string,
  options?: { baseUrl?: string; pageDetail?: PageDetail },
) => Promise<void>;

type UseDesktopNoteMutationsParams = {
  activeBaseEntryId: string | null | undefined;
  activeSource: ActiveSource | null;
  activeTreeSelectionKind: ActiveTreeSelectionKind;
  bridgeBaseUrl: string;
  focusedNodeId: string | null;
  graphMode: "synced" | "frozen";
  loadSelectedPage: NoteSelectionLoader;
  openSelectedPage: NoteSelectionLoader;
  refreshPageGraph: (pageId: string, options?: { baseUrl?: string }) => Promise<void>;
  requestCurrentGraphRefresh: () => void;
  shellState: {
    editorDrafts: Record<string, string>;
    openTabs: PageDetail[];
    selectedPage: PageDetail | null;
    setCreateNoteDraft: (value: { parent_id?: string | null } | null) => void;
    setEditorDrafts: (
      value:
        | Record<string, string>
        | ((current: Record<string, string>) => Record<string, string>),
    ) => void;
    setIsCreatingNote: (value: boolean) => void;
    setOpenTabs: (value: PageDetail[] | ((current: PageDetail[]) => PageDetail[])) => void;
    setSelectedPage: (value: PageDetail | null) => void;
    setSelectionErrorMessage: (message: string) => void;
  };
};

function shouldRefreshScopeGraph(activeTreeSelectionKind: ActiveTreeSelectionKind) {
  return (
    activeTreeSelectionKind === "notes" ||
    activeTreeSelectionKind === "smart-folder"
  );
}

function buildPatchedGraphNode(
  node: GraphResponseNode,
  page: PageDetail,
) {
  return {
    ...node,
    title: page.title,
    type: page.type,
    status: page.status,
    subject: [...page.subject],
    tags: [...page.tags],
    parentId: page.parent_id,
    created_at: page.created_at,
    updated_at: page.updated_at,
    reviewed_at: page.reviewed_at,
    review_interval_days: page.review_interval_days,
    snippet: page.content.slice(0, 180),
    content: page.content,
  };
}

export function useDesktopNoteMutations({
  activeBaseEntryId,
  activeSource,
  activeTreeSelectionKind,
  bridgeBaseUrl,
  focusedNodeId,
  graphMode,
  loadSelectedPage,
  openSelectedPage,
  refreshPageGraph,
  requestCurrentGraphRefresh,
  shellState,
}: UseDesktopNoteMutationsParams) {
  const {
    editorDrafts,
    openTabs,
    selectedPage,
    setCreateNoteDraft,
    setEditorDrafts,
    setIsCreatingNote,
    setOpenTabs,
    setSelectedPage,
    setSelectionErrorMessage,
  } = shellState;

  const selectPageForCurrentMode = useCallback(
    async (pageId: string, pageDetail: PageDetail) => {
      const selectPage =
        graphMode !== "frozen" && activeTreeSelectionKind === "page" ? loadSelectedPage : openSelectedPage;
      await selectPage(pageId, {
        baseUrl: bridgeBaseUrl,
        pageDetail,
      });
    },
    [activeTreeSelectionKind, bridgeBaseUrl, graphMode, loadSelectedPage, openSelectedPage],
  );

  const clearDraftIfEquivalent = useCallback(
    (pageId: string, persistedContent: string) => {
      setEditorDrafts((current) => {
        const currentDraft = current[pageId];
        if (currentDraft === undefined || !isEditorMarkdownEquivalent(currentDraft, persistedContent)) {
          return current;
        }

        const nextDrafts = { ...current };
        delete nextDrafts[pageId];
        return nextDrafts;
      });
    },
    [setEditorDrafts],
  );

  const mutationBaseOptions = useCallback(
    () => workingBaseMutationOptions(activeSource, activeBaseEntryId),
    [activeBaseEntryId, activeSource],
  );

  const patchGraphsFromPageDetail = useCallback(
    (
      page: PageDetail,
      options?: { scopeKinds?: Array<"page" | "notes" | "source" | "smart-folder"> },
    ) => {
      const patchedCurrentGraph = useGraphStore.getState().patchGraphsContainingNode(
        page.id,
        (node) => buildPatchedGraphNode(node, page),
        options,
      );
      if (patchedCurrentGraph) {
        setOptionsFromNodes(useGraphStore.getState().graphData?.nodes ?? []);
      }
      return patchedCurrentGraph;
    },
    [],
  );

  const createNoteMutation = useMutation({
    mutationFn: async (draft: { title: string; parent_id?: string | null }) => {
      if (!bridgeBaseUrl) {
        throw new Error("Desktop bridge failed to load.");
      }
      if (activeSource?.kind === "shared-base") {
        throw new Error("Creating notes inside shared bases is not available in the desktop shell.");
      }
      return createPage(
        bridgeBaseUrl,
        {
          title: draft.title,
          content: "",
          type: "fleeting",
          parent_id: draft.parent_id,
        },
        mutationBaseOptions(),
      );
    },
    onSuccess: async (created) => {
      setIsCreatingNote(false);
      setCreateNoteDraft(null);
      await selectPageForCurrentMode(created.id, created);
      if (graphMode === "frozen") {
        useGraphStore.getState().markGraphStale();
        return;
      }
      if (activeTreeSelectionKind !== "page") {
        requestCurrentGraphRefresh();
      }
    },
  });

  const renameNoteMutation = useMutation({
    mutationFn: async ({ pageId, title }: { pageId: string; title: string }) => {
      if (!bridgeBaseUrl) {
        throw new Error("Desktop bridge failed to load.");
      }
      if (activeSource?.kind === "shared-base") {
        return updatePage(
          bridgeBaseUrl,
          pageId,
          {
            title,
          },
          {
            baseRef: `shared:${activeSource.grantId}`,
            recipientActorRef: activeSource.recipientActorRef,
            recipientAccountId: activeSource.recipientAccountId ?? undefined,
          },
        );
      }
      return updatePage(bridgeBaseUrl, pageId, { title }, mutationBaseOptions());
    },
    onSuccess: async (updated) => {
      setOpenTabs((current) => current.map((tab) => (tab.id === updated.id ? updated : tab)));
      if (selectedPage?.id === updated.id) {
        setSelectedPage(updated);
      }
      patchGraphsFromPageDetail(updated);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (pageId: string) => {
      if (!bridgeBaseUrl) {
        throw new Error("Desktop bridge failed to load.");
      }
      if (activeSource?.kind === "shared-base") {
        throw new Error("Deleting notes inside shared bases is not available in the desktop shell.");
      }
      await deletePage(bridgeBaseUrl, pageId, mutationBaseOptions());
      return pageId;
    },
    onSuccess: async (pageId) => {
      const remainingTabs = openTabs.filter((tab) => tab.id !== pageId);
      setOpenTabs(remainingTabs);
      setEditorDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[pageId];
        return nextDrafts;
      });

      if (focusedNodeId === pageId) {
        useGraphStore.getState().clearSelectedNodes();
      }

      if (selectedPage?.id === pageId) {
        setSelectedPage(null);
      }

      if (graphMode === "frozen") {
        useGraphStore.getState().markGraphStale();
      }

      if (shouldRefreshScopeGraph(activeTreeSelectionKind)) {
        if (graphMode === "frozen") {
          return;
        }
        requestCurrentGraphRefresh();
        return;
      }

      if (remainingTabs.length > 0) {
        await selectPageForCurrentMode(remainingTabs[0].id, remainingTabs[0]);
        return;
      }

      if (graphMode === "frozen") {
        useGraphStore.getState().clearSelectedNodes();
        return;
      }

      useGraphStore.getState().resetGraphState();
      setOptionsFromNodes([]);
    },
  });

  const savePageMutation = useMutation({
    mutationFn: async ({ pageId, nextContent }: { pageId: string; nextContent: string }) => {
      if (!bridgeBaseUrl) {
        throw new Error("Could not save note.");
      }
      if (activeSource?.kind === "shared-base") {
        return updatePage(
          bridgeBaseUrl,
          pageId,
          {
            content: nextContent,
          },
          {
            baseRef: `shared:${activeSource.grantId}`,
            recipientActorRef: activeSource.recipientActorRef,
            recipientAccountId: activeSource.recipientAccountId ?? undefined,
          },
        );
      }
      return updatePage(bridgeBaseUrl, pageId, { content: nextContent }, mutationBaseOptions());
    },
    onSuccess: async (updatedPage) => {
      setOpenTabs((current) => current.map((tab) => (tab.id === updatedPage.id ? updatedPage : tab)));
      clearDraftIfEquivalent(updatedPage.id, updatedPage.content);

      const isSavedPageSelected = selectedPage?.id === updatedPage.id;
      if (isSavedPageSelected) {
        setSelectedPage(updatedPage);
      }

      const refreshAction = resolveContentSaveGraphRefreshAction(
        activeTreeSelectionKind,
        graphMode,
        isSavedPageSelected,
      );

      if (refreshAction.kind === "mark-stale") {
        useGraphStore.getState().markGraphStale();
        return;
      }

      if (refreshAction.kind === "refresh-scope-graph-only") {
        requestCurrentGraphRefresh();
        return;
      }

      patchGraphsFromPageDetail(updatedPage);

      if (refreshAction.kind === "patch-and-refresh-page-graph") {
        await refreshPageGraph(updatedPage.id, { baseUrl: bridgeBaseUrl });
        return;
      }

      requestCurrentGraphRefresh();
    },
  });

  const handleSavePageContent = useCallback(
    async (pageId?: string, nextContentOverride?: string) => {
      const targetPageId = pageId ?? selectedPage?.id;
      if (!bridgeBaseUrl || !targetPageId) {
        return false;
      }

      await Promise.resolve();

      const sourcePage =
        openTabs.find((tab) => tab.id === targetPageId) ??
        (selectedPage?.id === targetPageId ? selectedPage : null);
      if (!sourcePage) {
        return false;
      }

      const nextContent =
        nextContentOverride ?? editorDrafts[targetPageId] ?? sourcePage.content;
      if (isEditorMarkdownEquivalent(nextContent, sourcePage.content)) {
        clearDraftIfEquivalent(targetPageId, sourcePage.content);
        return true;
      }

      try {
        setSelectionErrorMessage("");
        await savePageMutation.mutateAsync({ pageId: targetPageId, nextContent });
        return true;
      } catch (error) {
        setSelectionErrorMessage(error instanceof Error ? error.message : "Could not save note.");
        return false;
      }
    },
    [
      activeSource,
      bridgeBaseUrl,
      clearDraftIfEquivalent,
      editorDrafts,
      openTabs,
      savePageMutation,
      selectedPage,
      setSelectionErrorMessage,
    ],
  );

  return {
    createNoteMutation,
    deleteNoteMutation,
    handleSavePageContent,
    renameNoteMutation,
    savePageMutation,
  };
}
