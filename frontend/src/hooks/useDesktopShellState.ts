import { useCallback, useMemo, useState } from "react";

import type { ActiveTreeSelectionKind } from "@/components/shell/desktopShellContext";
import { isEditorMarkdownEquivalent } from "@/components/editor/markdownInterop";
import type { ActiveSource } from "@/types/source";
import type { PageDetail } from "@/types";

export function useDesktopShellState() {
  const [openTabs, setOpenTabs] = useState<PageDetail[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageDetail | null>(null);
  const [activeSource, setActiveSource] = useState<ActiveSource | null>(null);
  const [activeSourceNodeId, setActiveSourceNodeId] = useState<string | null>(null);
  const [activeTreeSelectionKind, setActiveTreeSelectionKind] =
    useState<ActiveTreeSelectionKind>("notes");
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [createNoteDraft, setCreateNoteDraft] = useState<{ parent_id?: string | null } | null>(null);
  const [editorDrafts, setEditorDrafts] = useState<Record<string, string>>({});
  const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);
  const [windowClosePending, setWindowClosePending] = useState(false);
  const [selectionErrorMessage, setSelectionErrorMessageState] = useState("");
  const [selectionNoticeMessage, setSelectionNoticeMessageState] = useState("");
  const [externalUpdatePendingPageIds, setExternalUpdatePendingPageIds] = useState<string[]>(
    [],
  );

  const setSelectionErrorMessage = useCallback((message: string) => {
    setSelectionErrorMessageState(message);
    if (message) {
      setSelectionNoticeMessageState("");
    }
  }, []);

  const setSelectionNoticeMessage = useCallback((message: string) => {
    setSelectionNoticeMessageState(message);
    if (message) {
      setSelectionErrorMessageState("");
    }
  }, []);

  const clearSelectionFeedback = useCallback(() => {
    setSelectionErrorMessageState("");
    setSelectionNoticeMessageState("");
  }, []);

  const markExternalUpdatePending = useCallback((pageId: string) => {
    setExternalUpdatePendingPageIds((current) =>
      current.includes(pageId) ? current : [...current, pageId],
    );
  }, []);

  const clearExternalUpdatePending = useCallback((pageId: string) => {
    setExternalUpdatePendingPageIds((current) =>
      current.filter((pendingPageId) => pendingPageId !== pageId),
    );
  }, []);

  const clearAllExternalUpdatePending = useCallback(() => {
    setExternalUpdatePendingPageIds([]);
  }, []);

  const activeEditorDraft = useMemo(
    () =>
      selectedPage ? editorDrafts[selectedPage.id] ?? selectedPage.content : "",
    [editorDrafts, selectedPage],
  );

  const dirtyPageIds = useMemo(
    () =>
      openTabs
        .filter((tab) => {
          const draft = editorDrafts[tab.id];
          if (draft === undefined) {
            return false;
          }
          return !isEditorMarkdownEquivalent(draft, tab.content);
        })
        .map((tab) => tab.id),
    [editorDrafts, openTabs],
  );

  return {
    activeEditorDraft,
    activeSource,
    activeSourceNodeId,
    activeTreeSelectionKind,
    createNoteDraft,
    clearAllExternalUpdatePending,
    clearExternalUpdatePending,
    dirtyPageIds,
    editorDrafts,
    externalUpdatePendingPageIds,
    markExternalUpdatePending,
    isCreatingNote,
    openTabs,
    pendingCloseTabId,
    selectedPage,
    selectionErrorMessage,
    selectionNoticeMessage,
    setActiveSource,
    setActiveSourceNodeId,
    setActiveTreeSelectionKind,
    setCreateNoteDraft,
    setEditorDrafts,
    setIsCreatingNote,
    setOpenTabs,
    setPendingCloseTabId,
    setSelectedPage,
    clearSelectionFeedback,
    setSelectionErrorMessage,
    setSelectionNoticeMessage,
    setWindowClosePending,
    windowClosePending,
  };
}

export type DesktopShellState = ReturnType<typeof useDesktopShellState>;
