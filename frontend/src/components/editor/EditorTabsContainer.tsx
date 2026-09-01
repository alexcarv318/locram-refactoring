import { useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import {
  DatabaseIcon,
  EditorMenuIcon,
  GlobalIcon,
  NoteIcon,
  RegisterBaseIcon,
  SettingsIcon,
  ShareBaseIcon,
} from "@/components/icons/Icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils/cn";
import { managedBaseDisplayLabelKey } from "@/types/source";

import EditorInnerTab from "./EditorInnerTab";

interface EditorTabsContainerProps {
  onCloseAllTabs?: () => void;
  onCloseOtherFileTabs?: (...keepPageIds: string[]) => void;
  onSelectTab?: (id: string) => void;
  onCloseTab?: (id: string) => void;
}

type TabContextMenuState = {
  tabId: string;
  x: number;
  y: number;
};

export default function EditorTabsContainer({
  onCloseAllTabs,
  onCloseOtherFileTabs,
  onSelectTab,
  onCloseTab,
}: EditorTabsContainerProps) {
  const { tabs, activeTabId, setActiveTab, removeTab } = useEditorStore();
  const t = useT();
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<TabContextMenuState | null>(null);
  const handleSelectTab = onSelectTab ?? setActiveTab;
  const handleCloseTab = onCloseTab ?? removeTab;
  const fileTabs = tabs.filter((tab) => tab.tabType === "file");
  const hasMultipleFileTabs = fileTabs.length > 1;

  const tabMenuPanelClassName = "flex w-max min-w-0 flex-col p-1";
  const tabMenuItemClassName =
    "hover:bg-menu-hover-bg text-foreground block w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm whitespace-nowrap";

  const showOverflowCloseOthers =
    hasMultipleFileTabs && Boolean(onCloseOtherFileTabs) && Boolean(activeTabId);
  const hasFileTabs = fileTabs.length > 0;
  const showOverflowCloseAll = hasFileTabs && Boolean(onCloseAllTabs);
  const showContextCloseOthers = hasMultipleFileTabs && Boolean(onCloseOtherFileTabs);
  const showContextCloseAll = hasFileTabs && Boolean(onCloseAllTabs);

  return (
    <div className="border-border bg-muted/30 flex h-9 w-full shrink-0 items-center gap-1 border-b pe-3 ps-0">
      <div
        aria-label="Open note tabs"
        className="scrollbar-hide flex min-w-0 flex-1 overflow-x-auto"
        role="tablist"
      >
        {tabs.map((tab) => {
          const icon =
            tab.icon ||
            (tab.tabType === "source" && tab.sourceContext ? (
              tab.sourceContext.source.kind === "local-base" ||
              tab.sourceContext.source.kind === "shared-base" ||
              tab.sourceContext.source.kind === "managed-base" ? (
                <DatabaseIcon className="h-4 w-4" />
              ) : tab.sourceContext.source.kind === "file-home" ? (
                <RegisterBaseIcon className="h-4 w-4" />
              ) : (
                <NoteIcon className="h-4 w-4" />
              )
            ) : tab.tabType === "settings" ? (
              <SettingsIcon className="h-4 w-4" />
            ) : tab.tabType === "network" ? (
              <GlobalIcon className="h-4 w-4" />
            ) : tab.tabType === "sharing" && tab.sharingTab === "base-grants" ? (
              <ShareBaseIcon className="h-4 w-4" />
            ) : (
              <NoteIcon className="h-4 w-4" />
            ));

          const displayLabel =
            tab.tabType === "settings"
              ? t("editor.tab.settings")
              : tab.tabType === "source" && tab.sourceContext?.source.kind === "managed-base"
                ? t(managedBaseDisplayLabelKey(tab.sourceContext.source.managedBaseKind))
                : tab.tabType === "sharing" && tab.sharingTab === "base-grants"
                  ? t("editor.tab.baseSharing")
                  : tab.title;

          return (
            <EditorInnerTab
              key={tab.id}
              id={tab.id}
              label={displayLabel}
              active={tab.id === activeTabId}
              icon={icon}
              modified={tab.modified}
              externalUpdatePending={tab.externalUpdatePending}
              externalUpdatePendingTitle={
                tab.externalUpdatePending ? t("editor.tab.externalUpdatePending") : undefined
              }
              onSelect={handleSelectTab}
              onClose={handleCloseTab}
              onContextMenu={
                tab.tabType === "file"
                  ? (tabId, event) => {
                      setContextMenu({
                        tabId,
                        x: event.clientX,
                        y: event.clientY,
                      });
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
      {showOverflowCloseOthers || showOverflowCloseAll ? (
        <div className="z-10 shrink-0">
          <Popover open={overflowMenuOpen} onOpenChange={setOverflowMenuOpen}>
            <PopoverTrigger asChild>
              <button
                aria-label={t("editor.tabs.overflowMenu")}
                className="text-text-secondary hover:text-foreground hover:bg-menu-hover-bg flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md p-1"
                type="button"
              >
                <EditorMenuIcon className="h-4 w-4 rotate-90" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="right" className={tabMenuPanelClassName} side="bottom">
              {showOverflowCloseOthers ? (
                <button
                  className={tabMenuItemClassName}
                  onClick={() => {
                    if (!activeTabId || !onCloseOtherFileTabs) {
                      return;
                    }
                    onCloseOtherFileTabs(activeTabId);
                    setOverflowMenuOpen(false);
                  }}
                  type="button"
                >
                  {t("editor.tabs.closeOthers")}
                </button>
              ) : null}
              {showOverflowCloseAll ? (
                <button
                  className={tabMenuItemClassName}
                  onClick={() => {
                    void onCloseAllTabs?.();
                    setOverflowMenuOpen(false);
                  }}
                  type="button"
                >
                  {t("editor.tabs.closeAllNotes")}
                </button>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>
      ) : null}
      {contextMenu ? (
        <>
          <button
            aria-label={t("editor.tabs.overflowMenu")}
            className="fixed inset-0 z-[60] cursor-default"
            onClick={() => setContextMenu(null)}
            type="button"
          />
          <div
            className={cn(
              "border-border bg-panel-background fixed z-[61] rounded-md border shadow-lg",
              tabMenuPanelClassName,
            )}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className={tabMenuItemClassName}
              onClick={() => {
                void handleCloseTab(contextMenu.tabId);
                setContextMenu(null);
              }}
              type="button"
            >
              {t("editor.tabs.close")}
            </button>
            {showContextCloseOthers ? (
              <button
                className={tabMenuItemClassName}
                onClick={() => {
                  const contextTabId = contextMenu.tabId;
                  if (activeTabId !== contextTabId) {
                    handleSelectTab(contextTabId);
                  }
                  onCloseOtherFileTabs?.(contextTabId);
                  setContextMenu(null);
                }}
                type="button"
              >
                {t("editor.tabs.closeOthers")}
              </button>
            ) : null}
            {showContextCloseAll ? (
              <button
                className={tabMenuItemClassName}
                onClick={() => {
                  void onCloseAllTabs?.();
                  setContextMenu(null);
                }}
                type="button"
              >
                {t("editor.tabs.closeAllNotes")}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
