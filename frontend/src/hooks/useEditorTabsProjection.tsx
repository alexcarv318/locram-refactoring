import { useEffect } from "react";

import { NoteIcon } from "@/components/icons/Icons";
import { useEditorStore } from "@/stores/editorStore";
import type { PageDetail } from "@/types";

type UseEditorTabsProjectionParams = {
  dirtyPageIds: string[];
  externalUpdatePendingPageIds: string[];
  openTabs: PageDetail[];
  selectedPageId: string | null;
};

export function useEditorTabsProjection({
  dirtyPageIds,
  externalUpdatePendingPageIds,
  openTabs,
  selectedPageId,
}: UseEditorTabsProjectionParams) {
  const setEditorTabs = useEditorStore((state) => state.setTabs);

  useEffect(() => {
    const editorTabs = useEditorStore.getState().tabs;
    if (openTabs.length === 0 && editorTabs.length === 0) {
      return;
    }

    const nextTabs = openTabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
      tabType: "file" as const,
      content: tab.content,
      fileType: "md" as const,
      icon: <NoteIcon className="h-4 w-4" />,
      modified: dirtyPageIds.includes(tab.id),
      externalUpdatePending: externalUpdatePendingPageIds.includes(tab.id),
    }));

    setEditorTabs(nextTabs, selectedPageId);
  }, [dirtyPageIds, externalUpdatePendingPageIds, openTabs, selectedPageId, setEditorTabs]);
}
