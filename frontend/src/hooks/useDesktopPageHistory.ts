import { useCallback, useRef, useState } from "react";

import type { PageDetail } from "@/types";

type UseDesktopPageHistoryParams = {
  openTabs: PageDetail[];
  selectPageWithCurrentMode: (
    pageId: string,
    options?: { pageDetail?: PageDetail; baseUrl?: string },
  ) => Promise<void>;
  setSelectionErrorMessage: (message: string) => void;
};

export function useDesktopPageHistory({
  openTabs,
  selectPageWithCurrentMode,
  setSelectionErrorMessage,
}: UseDesktopPageHistoryParams) {
  const [pageNavHistory, setPageNavHistory] = useState<{ cursor: number; ids: string[] }>({
    cursor: -1,
    ids: [],
  });
  const pageNavHistoryRef = useRef(pageNavHistory);
  pageNavHistoryRef.current = pageNavHistory;
  const skipHistoryNavigationRef = useRef(false);

  const commitHistoryAfterNavigation = useCallback((pageId: string) => {
    if (skipHistoryNavigationRef.current) {
      skipHistoryNavigationRef.current = false;
      return;
    }

    setPageNavHistory((prev) => {
      const sliced = prev.ids.slice(0, prev.cursor + 1);
      if (sliced[sliced.length - 1] === pageId) {
        return prev;
      }

      const ids = [...sliced, pageId];
      return { cursor: ids.length - 1, ids };
    });
  }, []);

  const goBackInPageHistory = useCallback(async () => {
    const prev = pageNavHistoryRef.current;
    if (prev.cursor <= 0) {
      return;
    }

    const newCursor = prev.cursor - 1;
    const pageId = prev.ids[newCursor];
    skipHistoryNavigationRef.current = true;
    setPageNavHistory({ ...prev, cursor: newCursor });
    setSelectionErrorMessage("");
    try {
      const existingTab = openTabs.find((tab) => tab.id === pageId);
      await selectPageWithCurrentMode(pageId, existingTab ? { pageDetail: existingTab } : undefined);
    } catch (error) {
      setSelectionErrorMessage(error instanceof Error ? error.message : "Could not load note.");
    }
  }, [
    openTabs,
    selectPageWithCurrentMode,
    setSelectionErrorMessage,
  ]);

  const goForwardInPageHistory = useCallback(async () => {
    const prev = pageNavHistoryRef.current;
    if (prev.cursor >= prev.ids.length - 1) {
      return;
    }

    const newCursor = prev.cursor + 1;
    const pageId = prev.ids[newCursor];
    skipHistoryNavigationRef.current = true;
    setPageNavHistory({ ...prev, cursor: newCursor });
    setSelectionErrorMessage("");
    try {
      const existingTab = openTabs.find((tab) => tab.id === pageId);
      await selectPageWithCurrentMode(pageId, existingTab ? { pageDetail: existingTab } : undefined);
    } catch (error) {
      setSelectionErrorMessage(error instanceof Error ? error.message : "Could not load note.");
    }
  }, [
    openTabs,
    selectPageWithCurrentMode,
    setSelectionErrorMessage,
  ]);

  const seedInitialPageHistory = useCallback((pageId: string) => {
    setPageNavHistory((prev) => {
      if (prev.ids.length > 0) {
        return prev;
      }
      return { cursor: 0, ids: [pageId] };
    });
  }, []);

  const resetPageHistory = useCallback(() => {
    setPageNavHistory({ cursor: -1, ids: [] });
  }, []);

  return {
    canGoBackInPageHistory: pageNavHistory.cursor > 0,
    canGoForwardInPageHistory:
      pageNavHistory.ids.length > 0 && pageNavHistory.cursor < pageNavHistory.ids.length - 1,
    commitHistoryAfterNavigation,
    goBackInPageHistory,
    goForwardInPageHistory,
    resetPageHistory,
    seedInitialPageHistory,
  };
}
