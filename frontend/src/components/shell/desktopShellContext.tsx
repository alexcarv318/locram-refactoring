import { createContext, useContext } from "react";

import type { FilterPreset } from "@/lib/graph/filter-state/index";
import type { ActiveSource } from "@/types/source";
import type { PageOpenDisposition } from "@/lib/pageOpenTabs";
import type { PageDetail, PageSummary } from "@/types";

export type ActiveTreeSelectionKind = "page" | "notes" | "smart-folder";
export type ActivateSourceOptions = {
  forceRefresh?: boolean;
  preserveCurrentTab?: boolean;
  showSourceTab?: boolean;
};

export type DesktopShellContextValue = {
  activeEditorDraft: string;
  activeSource: ActiveSource | null;
  activeSourceNodeId: string | null;
  activeTreeSelectionKind: ActiveTreeSelectionKind;
  authoritativeFilterOptionsPending: boolean;
  bridgeBaseUrl: string;
  createNoteDraft: { parent_id?: string | null } | null;
  dirtyPageIds: string[];
  externalUpdatePendingPageIds: string[];
  isCreatingNote: boolean;
  isGraphRefreshing: boolean;
  isLoading: boolean;
  isSavingPage: boolean;
  isSubmitting: boolean;
  notes: PageSummary[];
  openTabs: PageDetail[];
  pendingCloseTabId: string | null;
  selectedPage: PageDetail | null;
  notesScopeKey: string;
  onCancelCreateNote: () => void;
  onCancelCloseDirtyTab: () => void;
  onChangeEditorDraft: (value: string) => void;
  onConfirmCloseDirtyTabDiscard: () => Promise<void>;
  onConfirmCloseDirtyTabSave: () => Promise<void>;
  onActivateSource: (source: ActiveSource, options?: ActivateSourceOptions) => Promise<void>;
  onCloseAllTabs: () => Promise<void>;
  onCloseOtherFileTabs: (...keepPageIds: string[]) => Promise<void>;
  onCloseTab: (pageId: string) => Promise<void>;
  onConfirmCreateNote: (title: string) => void;
  onDeleteNote: (pageId: string) => Promise<void>;
  onClearSmartFolderScope: () => void;
  onRenameNote: (pageId: string, title: string) => Promise<void>;
  onSavePageContent: (pageId?: string, value?: string) => Promise<boolean>;
  onSelectPage: (
    pageId: string,
    options?: { tabDisposition?: PageOpenDisposition },
  ) => Promise<void>;
  onSelectNotesScope: () => Promise<void>;
  onSelectSmartFolderScope: (preset: FilterPreset) => Promise<void>;
  onSelectSourceNode: (nodeId: string) => Promise<void>;
  onStartCreateNote: (draft?: { parent_id?: string | null }) => void;
};

export const DesktopShellContext = createContext<DesktopShellContextValue | null>(null);

export function useDesktopShellContext() {
  const context = useContext(DesktopShellContext);
  if (!context) {
    throw new Error("Desktop shell panels must be rendered within DesktopShellContext.");
  }
  return context;
}
