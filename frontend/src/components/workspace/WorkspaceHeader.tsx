import { useT } from "@/i18n/useT";
import { useTheme } from "@/providers/theme-provider";
import { SETTINGS_TAB_ID, useEditorStore } from "@/stores/editorStore";
import { useShellLayoutStore } from "@/stores/shellLayoutStore";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MoonIcon,
  ReloadIcon,
  SettingsIcon,
  SidebarToggleLeftIcon,
  SidebarToggleRightIcon,
  SunIcon,
} from "@/components/icons/Icons";
import type { SearchResultItem } from "@/components/popover/PopoverSearchResults";
import PopoverSearch from "@/components/popover/PopoverSearch";
import { cn } from "@/lib/utils/cn";

interface WorkspaceHeaderProps {
  onSearch: (query: string) => Promise<SearchResultItem[]>;
  onSelectSearchItem: (item: SearchResultItem) => void;
  canGoBackInPageHistory: boolean;
  canGoForwardInPageHistory: boolean;
  onGoBackInPageHistory: () => Promise<void>;
  onGoForwardInPageHistory: () => Promise<void>;
  activeBaseLabel?: string;
}

export default function WorkspaceHeader({
  onSearch,
  onSelectSearchItem,
  canGoBackInPageHistory,
  canGoForwardInPageHistory,
  onGoBackInPageHistory,
  onGoForwardInPageHistory,
  activeBaseLabel,
}: WorkspaceHeaderProps) {
  const t = useT();
  const { tabs, toggleTab } = useShellLayoutStore();
  const { activeTabId, closeSettings, openSettings } = useEditorStore();
  const { theme, toggleTheme } = useTheme();
  const isTreeVisible = tabs.find((tab) => tab.id === "tree")?.isVisible ?? true;
  const isSourcesVisible = tabs.find((tab) => tab.id === "sources")?.isVisible ?? true;
  const settingsIsActive = activeTabId === SETTINGS_TAB_ID;
  const handleReload = () => {
    window.location.reload();
  };
  const navigationToggleLabel = t("workspace.header.toggleNavigation");
  const inspectorToggleLabel = t("workspace.header.toggleInspector");
  const backLabel = t("workspace.header.back");
  const forwardLabel = t("workspace.header.forward");
  const reloadLabel = t("workspace.header.reload");
  const themeLabel =
    theme === "light"
      ? t("workspace.header.switchToDarkTheme")
      : t("workspace.header.switchToLightTheme");
  const settingsToggleLabel = settingsIsActive
    ? t("workspace.header.closeSettings")
    : t("workspace.header.openSettings");
  const settingsButtonTitle = settingsIsActive
    ? t("workspace.header.closeSettings")
    : t("workspace.header.settings");

  return (
    <header className="border-border bg-background relative flex h-[40px] items-center justify-between border-b px-4 py-2 backdrop-blur-sm">
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          aria-label={navigationToggleLabel}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150",
            isTreeVisible
              ? "text-foreground hover:bg-menu-hover-bg cursor-pointer"
              : "text-text-secondary hover:text-foreground hover:bg-menu-hover-bg cursor-pointer",
          )}
          onClick={() => toggleTab("tree")}
          title={navigationToggleLabel}
          type="button"
        >
          <SidebarToggleLeftIcon className="h-4 w-4 rtl:-scale-x-100" />
        </button>
        <button
          aria-label={backLabel}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150",
            canGoBackInPageHistory
              ? "text-foreground hover:bg-menu-hover-bg cursor-pointer"
              : "text-text-secondary cursor-not-allowed opacity-40",
          )}
          disabled={!canGoBackInPageHistory}
          onClick={() => void onGoBackInPageHistory()}
          title={backLabel}
          type="button"
        >
          <ArrowLeftIcon className="h-4 w-4 rtl:-scale-x-100" />
        </button>
        <button
          aria-label={reloadLabel}
          className="text-foreground hover:bg-menu-hover-bg flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-all duration-150"
          onClick={handleReload}
          title={reloadLabel}
          type="button"
        >
          <ReloadIcon className="h-[13px] w-[13px]" />
        </button>
        <button
          aria-label={forwardLabel}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150",
            canGoForwardInPageHistory
              ? "text-foreground hover:bg-menu-hover-bg cursor-pointer"
              : "text-text-secondary cursor-not-allowed opacity-40",
          )}
          disabled={!canGoForwardInPageHistory}
          onClick={() => void onGoForwardInPageHistory()}
          title={forwardLabel}
          type="button"
        >
          <ArrowRightIcon className="h-4 w-4 rtl:-scale-x-100" />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 flex justify-center px-56">
        <div className="pointer-events-auto flex w-full max-w-md items-center">
          <PopoverSearch label={activeBaseLabel ?? "locram"} onSearch={onSearch} onSelect={onSelectSearchItem} />
        </div>
      </div>

      <div className="ms-auto flex items-center gap-1">
        <button
          aria-label={themeLabel}
          className="text-foreground hover:bg-menu-hover-bg flex cursor-pointer items-center justify-center rounded-md bg-transparent p-1.5 transition-all duration-150"
          onClick={toggleTheme}
          title={themeLabel}
          type="button"
        >
          {theme === "light" ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
        </button>
        <button
          aria-label={settingsToggleLabel}
          className="text-foreground hover:bg-menu-hover-bg flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-all duration-150"
          onClick={settingsIsActive ? closeSettings : () => openSettings()}
          title={settingsButtonTitle}
          type="button"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
        <button
          aria-label={inspectorToggleLabel}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150",
            isSourcesVisible
              ? "text-foreground hover:bg-menu-hover-bg cursor-pointer"
              : "text-text-secondary hover:text-foreground hover:bg-menu-hover-bg cursor-pointer",
          )}
          onClick={() => toggleTab("sources")}
          title={inspectorToggleLabel}
          type="button"
        >
          <SidebarToggleRightIcon className="h-4 w-4 rtl:-scale-x-100" />
        </button>
      </div>
    </header>
  );
}
