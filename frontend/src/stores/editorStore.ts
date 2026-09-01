import { create } from "zustand";
import type {
  EditorTabItem,
  SourceInspectContext,
  SourceTabMode,
} from "@/types/editor/EditorTabItem";
import type { ActiveSource, FileHomeSource } from "@/types/source";

export const SETTINGS_TAB_ID = "settings-brokered-network";
export const BASE_SHARING_TAB_ID = "base-sharing";
export const SHARED_BASE_SESSION_TAB_ID = "shared-base-session";
export const SOURCE_TAB_ID = "active-source";
export const SOURCE_INSPECT_TAB_ID = "inspect-source";

interface EditorState {
  settingsOpen: boolean;
  tabs: EditorTabItem[];
  activeTabId: string | null;
  openBaseSharing: () => void;
  closeBaseSharing: () => void;
  openSharedBaseSession: (context?: { input?: string }) => void;
  closeSharedBaseSession: () => void;
  openSource: (
    source: ActiveSource,
    options?: {
      inspectContext?: SourceInspectContext;
      mode?: SourceTabMode;
      selectedNodeId?: string | null;
    },
  ) => void;
  closeSource: (tabId?: string) => void;
  retargetFileHomeSource: (currentPath: string, nextSource: FileHomeSource) => void;
  openSettings: (context?: { tab?: EditorTabItem["settingsTab"] }) => void;
  closeSettings: () => void;
  setSettingsTab: (tab: NonNullable<EditorTabItem["settingsTab"]>) => void;
  setTabs: (tabs: EditorTabItem[], activeTabId?: string | null) => void;
  setActiveTab: (id: string) => void;
  removeTab: (id: string) => void;
  closeAllTabs: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  settingsOpen: false,
  tabs: [],
  activeTabId: null,
  openBaseSharing: () =>
    set((state) => {
      const hasBaseSharingTab = state.tabs.some((tab) => tab.id === BASE_SHARING_TAB_ID);
      const baseSharingTab: EditorTabItem = {
        id: BASE_SHARING_TAB_ID,
        title: "Base Sharing",
        tabType: "sharing",
        sharingTab: "base-grants",
      };
      return {
        tabs: hasBaseSharingTab ? state.tabs : [...state.tabs, baseSharingTab],
        activeTabId: BASE_SHARING_TAB_ID,
      };
    }),
  closeBaseSharing: () =>
    set((state) => {
      const tabs = state.tabs.filter((tab) => tab.id !== BASE_SHARING_TAB_ID);
      return {
        tabs,
        activeTabId:
          state.activeTabId === BASE_SHARING_TAB_ID ? (tabs[0]?.id ?? null) : state.activeTabId,
      };
    }),
  openSharedBaseSession: (context) =>
    set((state) => {
      const hasSharedBaseSessionTab = state.tabs.some(
        (tab) => tab.id === SHARED_BASE_SESSION_TAB_ID,
      );
      const sharedBaseSessionTab: EditorTabItem = {
        id: SHARED_BASE_SESSION_TAB_ID,
        title: "Shared Base Session",
        tabType: "shared-base-session",
        sharedBaseSessionContext: context
          ? {
              input: context.input,
            }
          : undefined,
      };
      return {
        tabs: hasSharedBaseSessionTab
          ? state.tabs.map((tab) =>
              tab.id === SHARED_BASE_SESSION_TAB_ID
                ? {
                    ...tab,
                    ...sharedBaseSessionTab,
                    sharedBaseSessionContext: sharedBaseSessionTab.sharedBaseSessionContext,
                  }
                : tab,
            )
          : [...state.tabs, sharedBaseSessionTab],
        activeTabId: SHARED_BASE_SESSION_TAB_ID,
      };
    }),
  closeSharedBaseSession: () =>
    set((state) => {
      const tabs = state.tabs.filter((tab) => tab.id !== SHARED_BASE_SESSION_TAB_ID);
      return {
        tabs,
        activeTabId:
          state.activeTabId === SHARED_BASE_SESSION_TAB_ID
            ? (tabs[0]?.id ?? null)
            : state.activeTabId,
      };
    }),
  retargetFileHomeSource: (currentPath, nextSource) =>
    set((state) => {
      const currentTabId = `file-home:${encodeURIComponent(currentPath)}`;
      const nextTabId = `file-home:${encodeURIComponent(nextSource.path)}`;
      const currentTab = state.tabs.find((tab) => tab.id === currentTabId);
      if (!currentTab || currentTab.sourceContext?.source.kind !== "file-home") {
        return state;
      }

      const nextTab: EditorTabItem = {
        ...currentTab,
        id: nextTabId,
        title: nextSource.label,
        sourceContext: {
          ...currentTab.sourceContext,
          source: nextSource,
        },
      };

      const tabsWithoutCurrent = state.tabs.filter((tab) => tab.id !== currentTabId);
      const hasNextTab = tabsWithoutCurrent.some((tab) => tab.id === nextTabId);
      const tabs = hasNextTab
        ? tabsWithoutCurrent.map((tab) => (tab.id === nextTabId ? nextTab : tab))
        : tabsWithoutCurrent.map((tab) => tab).concat(nextTab);

      return {
        tabs,
        activeTabId: state.activeTabId === currentTabId ? nextTabId : state.activeTabId,
      };
    }),
  openSource: (source, options) =>
    set((state) => {
      const sourceTabId =
        source.kind === "file-home"
          ? `file-home:${encodeURIComponent(source.path)}`
          : options?.mode === "inspect"
            ? SOURCE_INSPECT_TAB_ID
            : SOURCE_TAB_ID;
      const hasSourceTab = state.tabs.some((tab) => tab.id === sourceTabId);
      const sourceTab: EditorTabItem = {
        id: sourceTabId,
        title: source.label,
        tabType: "source",
        sourceContext: {
          inspectContext: options?.inspectContext,
          mode: options?.mode ?? "active",
          source,
          selectedNodeId: options?.selectedNodeId,
        },
      };
      return {
        tabs: hasSourceTab
          ? state.tabs.map((tab) => (tab.id === sourceTabId ? { ...tab, ...sourceTab } : tab))
          : [...state.tabs, sourceTab],
        activeTabId: sourceTabId,
      };
    }),
  closeSource: (tabId = SOURCE_TAB_ID) =>
    set((state) => {
      const closingIndex = state.tabs.findIndex((tab) => tab.id === tabId);
      const tabs = state.tabs.filter((tab) => tab.id !== tabId);
      const fallbackIndex = closingIndex <= 0 ? 0 : closingIndex - 1;
      const fallbackTabId = tabs[Math.min(fallbackIndex, Math.max(tabs.length - 1, 0))]?.id ?? null;
      return {
        tabs,
        activeTabId: state.activeTabId === tabId ? fallbackTabId : state.activeTabId,
      };
    }),
  openSettings: (context) =>
    set((state) => {
      const existingSettingsTab = state.tabs.find((tab) => tab.id === SETTINGS_TAB_ID);
      const nextSettingsTab = context?.tab ?? existingSettingsTab?.settingsTab ?? "general";
      const hasSettingsTab = existingSettingsTab !== undefined;
      const settingsTab: EditorTabItem = {
        id: SETTINGS_TAB_ID,
        title: "Settings",
        tabType: "settings",
        settingsTab: nextSettingsTab,
      };
      return {
        settingsOpen: true,
        tabs: hasSettingsTab
          ? state.tabs.map((tab) =>
              tab.id === SETTINGS_TAB_ID ? { ...tab, settingsTab: nextSettingsTab } : tab,
            )
          : [...state.tabs, settingsTab],
        activeTabId: SETTINGS_TAB_ID,
      };
    }),
  closeSettings: () =>
    set((state) => {
      const tabs = state.tabs.filter((tab) => tab.id !== SETTINGS_TAB_ID);
      return {
        settingsOpen: false,
        tabs,
        activeTabId:
          state.activeTabId === SETTINGS_TAB_ID
            ? (tabs[0]?.id ?? null)
            : state.activeTabId,
      };
    }),
  setSettingsTab: (tab) =>
    set((state) => ({
      tabs: state.tabs.map((item) =>
        item.id === SETTINGS_TAB_ID ? { ...item, settingsTab: tab } : item,
      ),
    })),
  setTabs: (tabs, activeTabId) =>
    set((state) => {
      const preservedTabs = state.tabs.filter((tab) => tab.tabType !== "file");
      const nextTabs = [...tabs, ...preservedTabs.filter((preservedTab) => !tabs.some((tab) => tab.id === preservedTab.id))];
      const hasCurrentActiveTab =
        state.activeTabId !== null && nextTabs.some((tab) => tab.id === state.activeTabId);
      const hasRequestedActiveTab =
        activeTabId !== null && activeTabId !== undefined && nextTabs.some((tab) => tab.id === activeTabId);
      const nextActiveTabId =
        activeTabId !== undefined
          ? activeTabId === null
            ? (hasCurrentActiveTab ? state.activeTabId : null)
            : hasRequestedActiveTab
              ? activeTabId
              : hasCurrentActiveTab
                ? state.activeTabId
                : activeTabId
          : hasCurrentActiveTab
            ? state.activeTabId
            : (nextTabs[0]?.id ?? null);

      return {
        settingsOpen: nextTabs.some((tab) => tab.id === SETTINGS_TAB_ID),
        tabs: nextTabs,
        activeTabId: nextActiveTabId,
      };
    }),
  setActiveTab: (id) => set({ activeTabId: id }),
  removeTab: (id) =>
    set((state) => {
      const tabs = state.tabs.filter((tab) => tab.id !== id);
      return {
        settingsOpen: id === SETTINGS_TAB_ID ? false : state.settingsOpen,
        tabs,
        activeTabId: state.activeTabId === id ? (tabs[0]?.id ?? null) : state.activeTabId
      };
    }),
  closeAllTabs: () =>
    set({
      settingsOpen: false,
      tabs: [],
      activeTabId: null,
    }),
}));
