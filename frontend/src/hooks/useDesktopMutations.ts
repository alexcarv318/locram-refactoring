import { useCallback } from "react";
import type { ActiveTreeSelectionKind } from "@/components/shell/desktopShellContext";
import { useGraphStore } from "@/stores/graphStore";
import type { PageDetail } from "@/types";
import type { ActiveSource } from "@/types/source";
import type { DesktopShellState } from "./useDesktopShellState";
import { useDesktopNoteMutations } from "./useDesktopNoteMutations";

type UseDesktopMutationsParams = {
  activeBaseEntryId: string | null | undefined;
  activeSource: ActiveSource | null;
  activeTreeSelectionKind: ActiveTreeSelectionKind;
  bridgeBaseUrl: string;
  openSelectedPage: (
    pageId: string,
    options?: { baseUrl?: string; pageDetail?: PageDetail },
  ) => Promise<void>;
  loadSelectedPage: (
    pageId: string,
    options?: { baseUrl?: string; pageDetail?: PageDetail },
  ) => Promise<void>;
  refreshPageGraph: (pageId: string, options?: { baseUrl?: string }) => Promise<void>;
  shellState: DesktopShellState;
};

export function useDesktopMutations({
  activeBaseEntryId,
  activeSource,
  activeTreeSelectionKind,
  bridgeBaseUrl,
  openSelectedPage,
  loadSelectedPage,
  refreshPageGraph,
  shellState,
}: UseDesktopMutationsParams) {
  const graphMode = useGraphStore((state) => state.graphMode);
  const focusedNodeId = useGraphStore((state) => state.focusedNodeId);

  const requestCurrentGraphRefresh = useCallback(() => {
    useGraphStore.getState().requestGraphRefresh();
  }, []);

  const {
    createNoteMutation,
    deleteNoteMutation,
    handleSavePageContent,
    renameNoteMutation,
    savePageMutation,
  } = useDesktopNoteMutations({
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
  });

  return {
    createNoteMutation,
    deleteNoteMutation,
    handleSavePageContent,
    renameNoteMutation,
    savePageMutation,
  };
}
