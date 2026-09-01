import { useCallback } from "react";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

import type {
  ActivateSourceOptions,
  DesktopShellContextValue,
} from "@/components/shell/desktopShellContext";
import { isEditorMarkdownEquivalent } from "@/components/editor/markdownInterop";
import type { FilterPreset } from "@/lib/graph/filter-state/index";
import { useDesktopShellContextValue } from "@/hooks/useDesktopShellContextValue";
import { useDesktopShellStatus } from "@/hooks/useDesktopShellStatus";
import type { DesktopShellState } from "@/hooks/useDesktopShellState";
import { searchPages } from "@/api/sessionApi";
import { useGraphStore } from "@/stores/graphStore";
import type { PageSummary, SessionBootstrap } from "@/types";
import type { ActiveSource } from "@/types/source";
import type { SearchResultItem } from "@/components/popover/PopoverSearchResults";
import type { ShellTab } from "@/types/ShellTab";

type MutationStatusLike = Pick<
  UseMutationResult<unknown, Error, unknown, unknown>,
  "error" | "isPending"
>;
type QueryStatusLike<TData> = Pick<
  UseQueryResult<TData, Error>,
  "error" | "isPending"
>;

type MutationLike = {
  createNoteMutation: MutationStatusLike & {
    mutate: (payload: { title: string; parent_id?: string | null }) => void;
  };
  deleteNoteMutation: MutationStatusLike & {
    mutateAsync: (pageId: string) => Promise<unknown>;
  };
  renameNoteMutation: MutationStatusLike & {
    mutateAsync: (payload: {
      pageId: string;
      title: string;
    }) => Promise<unknown>;
  };
  savePageMutation: MutationStatusLike;
};

type HandlerLike = {
  clearSmartFolderScope: () => void;
  closeTabImmediately: (pageId: string) => Promise<void>;
  handleActivateSource: (source: ActiveSource, options?: ActivateSourceOptions) => Promise<void>;
  closeAllFileTabs: () => Promise<void>;
  closeOtherFileTabs: (...keepPageIds: string[]) => Promise<void>;
  handleCloseTab: (pageId: string) => Promise<void>;
  handleSavePageContent: (pageId?: string, value?: string) => Promise<boolean>;
  handleSelectNotesScope: () => Promise<void>;
  handleSelectPage: (
    pageId: string,
    options?: { tabDisposition?: import("@/lib/pageOpenTabs").PageOpenDisposition },
  ) => Promise<void>;
  handleSelectSourceNode: (nodeId: string) => Promise<void>;
  loadNotesScope: (options?: { baseUrl?: string }) => Promise<void>;
  loadSmartFolderScope: (
    preset: FilterPreset,
    options?: { baseUrl?: string },
  ) => Promise<void>;
};

type UseDesktopShellViewModelParams = {
  bridgeData: {
    bootstrapQuery: QueryStatusLike<SessionBootstrap> & {
      data: SessionBootstrap | undefined;
    };
    bridgeBaseUrlQuery: QueryStatusLike<string> & { data: string | undefined };
    notesTreeDataReady: boolean;
    notesTreePages: PageSummary[];
    notesTreeQuery: QueryStatusLike<PageSummary[]>;
  };
  isGraphRefreshLoading: boolean;
  handlers: HandlerLike;
  isSelectionLoading: boolean;
  layoutTabs: ShellTab[];
  mutations: MutationLike;
  shellState: DesktopShellState;
  notesScopeKey: string;
};

function sharedWorkingBaseOwnerLabel(
  source: Extract<ActiveSource, { kind: "shared-base" }>,
): string {
  const normalizedDisplayName = source.ownerDisplayName?.trim();
  if (normalizedDisplayName) {
    return normalizedDisplayName;
  }
  return source.ownerActorRef;
}

function capitalizeToken(value: string | undefined | null): string | null {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return null;
  }
  return normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1);
}

function activeWorkingBaseLabel(
  activeSource: ActiveSource | null,
  activeBaseDisplayName: string | undefined,
): string | undefined {
  if (!activeSource) {
    return activeBaseDisplayName
      ? `${activeBaseDisplayName} • Local base`
      : undefined;
  }
  if (activeSource.kind === "shared-base") {
    const stateLabel = capitalizeToken(activeSource.grantState) ?? "Ready";
    return [
      activeSource.label,
      "Shared",
      sharedWorkingBaseOwnerLabel(activeSource),
      `${capitalizeToken(activeSource.permission) ?? "Working"} access`,
      stateLabel,
    ].join(" • ");
  }
  if (activeSource.kind === "local-base") {
    return `${activeSource.label} • Local base`;
  }
  return activeSource.label;
}

export function useDesktopShellViewModel({
  bridgeData,
  isGraphRefreshLoading,
  handlers,
  isSelectionLoading,
  layoutTabs,
  mutations,
  shellState,
  notesScopeKey,
}: UseDesktopShellViewModelParams) {
  const { bootstrapQuery, bridgeBaseUrlQuery, notesTreeDataReady, notesTreePages } = bridgeData;
  const {
    activeEditorDraft,
    activeSource,
    activeSourceNodeId,
    activeTreeSelectionKind,
    createNoteDraft,
    dirtyPageIds,
    externalUpdatePendingPageIds,
    pendingCloseTabId,
    selectedPage,
    selectionErrorMessage,
    selectionNoticeMessage,
    isCreatingNote,
    openTabs,
    setEditorDrafts,
    setIsCreatingNote,
    setCreateNoteDraft,
    setPendingCloseTabId,
    setSelectionErrorMessage,
  } = shellState;
  const {
    createNoteMutation,
    deleteNoteMutation,
    renameNoteMutation,
    savePageMutation,
  } = mutations;
  const {
    closeAllFileTabs,
    closeOtherFileTabs,
    closeTabImmediately,
    clearSmartFolderScope,
    handleActivateSource,
    handleCloseTab,
    handleSavePageContent,
    handleSelectNotesScope,
    handleSelectPage,
    handleSelectSourceNode,
    loadSmartFolderScope,
    loadNotesScope,
  } = handlers;

  const {
    errorMessage,
    isGraphRefreshing,
    isLoading,
    isSavingPage,
    isSubmitting,
    noticeMessage,
    searchItems,
  } = useDesktopShellStatus({
    createNoteMutation,
    deleteNoteMutation,
    isGraphRefreshLoading,
    isSelectionLoading,
    renameNoteMutation,
    savePageMutation,
    selectionErrorMessage,
    selectionNoticeMessage,
    startupQueries: [bridgeBaseUrlQuery, bootstrapQuery],
  });

  const shellContextValue: DesktopShellContextValue =
    useDesktopShellContextValue({
      activeEditorDraft,
      activeSource,
      activeSourceNodeId,
      activeTreeSelectionKind,
      authoritativeFilterOptionsPending:
        activeTreeSelectionKind === "notes" &&
        (!activeSource || activeSource.kind === "local-base") &&
        !notesTreeDataReady,
      bridgeBaseUrl: bridgeBaseUrlQuery.data ?? "",
      createNoteDraft,
      dirtyPageIds,
      externalUpdatePendingPageIds,
      isCreatingNote,
      isGraphRefreshing,
      isLoading,
      isSavingPage,
      isSubmitting,
      notes: notesTreePages,
      openTabs,
      pendingCloseTabId,
      selectedPage,
      notesScopeKey,
      onCancelCreateNote: () => {
        setIsCreatingNote(false);
        setCreateNoteDraft(null);
      },
      onCancelCloseDirtyTab: () => {
        setPendingCloseTabId(null);
      },
      onChangeEditorDraft: (value: string) => {
        if (!selectedPage) {
          return;
        }

        setEditorDrafts((current) => {
          if (isEditorMarkdownEquivalent(value, selectedPage.content)) {
            const nextDrafts = { ...current };
            delete nextDrafts[selectedPage.id];
            return nextDrafts;
          }

          return {
            ...current,
            [selectedPage.id]: value,
          };
        });
      },
      onConfirmCloseDirtyTabDiscard: async () => {
        if (!pendingCloseTabId) {
          return;
        }

        setEditorDrafts((current) => {
          const nextDrafts = { ...current };
          delete nextDrafts[pendingCloseTabId];
          return nextDrafts;
        });
        setPendingCloseTabId(null);
        await closeTabImmediately(pendingCloseTabId);
      },
      onConfirmCloseDirtyTabSave: async () => {
        if (!pendingCloseTabId) {
          return;
        }

        const targetPageId = pendingCloseTabId;
        const didSave = await handleSavePageContent(targetPageId);
        if (!didSave) {
          return;
        }

        setPendingCloseTabId(null);
        await closeTabImmediately(targetPageId);
      },
      onActivateSource: handleActivateSource,
      onCloseAllTabs: closeAllFileTabs,
      onCloseOtherFileTabs: closeOtherFileTabs,
      onCloseTab: handleCloseTab,
      onConfirmCreateNote: (title: string) => {
        setSelectionErrorMessage("");
        createNoteMutation.mutate({
          title,
          parent_id: createNoteDraft?.parent_id ?? null,
        });
      },
      onClearSmartFolderScope: clearSmartFolderScope,
      onDeleteNote: async (pageId: string) => {
        setSelectionErrorMessage("");
        await deleteNoteMutation.mutateAsync(pageId);
      },
      onRenameNote: async (pageId: string, title: string) => {
        setSelectionErrorMessage("");
        await renameNoteMutation.mutateAsync({ pageId, title });
      },
      onSavePageContent: handleSavePageContent,
      onSelectNotesScope: () => handlers.handleSelectNotesScope(),
      onSelectPage: handleSelectPage,
      onSelectSourceNode: handleSelectSourceNode,
      onSelectSmartFolderScope: (preset: FilterPreset) =>
        loadSmartFolderScope(preset),
      onStartCreateNote: (draft?: { parent_id?: string | null }) => {
        setCreateNoteDraft(draft ?? null);
        setIsCreatingNote(true);
      },
    });

  const bridgeBaseUrl = bridgeBaseUrlQuery.data ?? "";

  const onSearch = useCallback(
    async (query: string): Promise<SearchResultItem[]> => {
      if (!bridgeBaseUrl || !query.trim()) {
        return [];
      }
      if (activeSource?.kind === "shared-base") {
        const hits = await searchPages(bridgeBaseUrl, query, {
          baseRef: `shared:${activeSource.grantId}`,
          recipientActorRef: activeSource.recipientActorRef,
          recipientAccountId: activeSource.recipientAccountId ?? undefined,
        });
        return hits.map((hit) => ({
          id: hit.id,
          type: "note" as const,
          title: hit.title,
          path: `${activeSource.label} • shared base`,
          updated_at: "",
          snippet: hit.snippet,
          match_kind: hit.match_kind,
        }));
      }
      if (activeSource?.kind === "managed-base") {
        const hits = await searchPages(bridgeBaseUrl, query, {
          baseRef: activeSource.baseRef,
        });
        return hits.map((hit) => ({
          id: hit.id,
          type: "note" as const,
          title: hit.title,
          path: `${activeSource.label} • built-in base`,
          updated_at: "",
          snippet: hit.snippet,
          match_kind: hit.match_kind,
        }));
      }
      if (activeSource && activeSource.kind !== "local-base") {
        const normalizedQuery = query.trim().toLowerCase();
        const sourceNodes =
          useGraphStore.getState().graphData?.nodes?.filter((node) => {
            const haystack =
              `${node.title ?? ""} ${node.snippet ?? ""}`.toLowerCase();
            return haystack.includes(normalizedQuery);
          }) ?? [];
        return sourceNodes.slice(0, 20).map((node) => ({
          id: String(node.id),
          type: "document" as const,
          title: String(node.title ?? "Untitled"),
          path: `${activeSource.label} • source`,
          updated_at: node.updated_at ?? "",
        }));
      }
      const hits = await searchPages(bridgeBaseUrl, query);
      return hits.map((hit) => ({
        id: hit.id,
        type: "note" as const,
        title: hit.title,
        path: `Notes • ${hit.type}`,
        updated_at: "",
        snippet: hit.snippet,
        match_kind: hit.match_kind,
      }));
    },
    [activeSource, bridgeBaseUrl],
  );

  const activeBaseLabel = activeWorkingBaseLabel(
    activeSource,
    bootstrapQuery.data?.active_base?.display_name,
  );

  return {
    activeBaseLabel,
    errorMessage,
    layoutTabs,
    noticeMessage,
    onSearch,
    pendingCloseTabId,
    onSelectSearchItem: (item: { id: string }) => {
      if (
        activeSource?.kind === "shared-base" ||
        activeSource?.kind === "managed-base"
      ) {
        void handleSelectPage(item.id);
        return;
      }
      if (activeSource && activeSource.kind !== "local-base") {
        void handleSelectSourceNode(item.id);
        return;
      }
      void handleSelectPage(item.id);
    },
    searchItems,
    shellContextValue,
  };
}
