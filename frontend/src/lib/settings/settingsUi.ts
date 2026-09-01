import { outlinedActionButtonClassName } from "@/lib/ui/outlinedActionButton";
import { cn } from "@/lib/utils/cn";

export const SETTINGS_SECONDARY_TEXT_CLASS = "text-foreground/60";

export const SETTINGS_SECONDARY_TEXT_HOVER_CLASS = "hover:text-foreground";

export const SETTINGS_GROUP_HEADING_CLASS =
  "flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/55";

export const SETTINGS_CARD_DESCRIPTION_CLASS = cn(
  "mt-1 text-xs leading-5",
  SETTINGS_SECONDARY_TEXT_CLASS,
);

export const SETTINGS_SUMMARY_CLASS = cn(
  "cursor-pointer text-xs font-medium transition",
  SETTINGS_SECONDARY_TEXT_CLASS,
  SETTINGS_SECONDARY_TEXT_HOVER_CLASS,
);

export const SETTINGS_MUTED_NOTICE_CLASS = cn(
  "rounded-lg border border-border bg-muted/10 px-3 py-2 text-xs",
  SETTINGS_SECONDARY_TEXT_CLASS,
);

export function settingsButtonClassName(
  disabled = false,
  compact = false,
): string {
  return outlinedActionButtonClassName(disabled, compact ? "compact" : "xs");
}

export function settingsStatusActionButtonClassName(disabled = false): string {
  return cn(
    "group relative inline-flex h-[34px] w-[90px] shrink-0 items-center justify-center overflow-hidden rounded-lg border px-3 text-xs font-medium transition",
    disabled
      ? "border-foreground/15 bg-muted/20 text-foreground/40 cursor-not-allowed opacity-70"
      : cn(
          "border-foreground/30 bg-background text-foreground/70",
          "hover:border-foreground/55 hover:bg-menu-hover-bg hover:text-foreground",
        ),
  );
}

export function settingsTabTriggerClassName(collapsed: boolean): string {
  return cn(
    "w-full justify-start gap-3 rounded-lg px-2 py-1.5 transition-colors",
    "text-foreground/60 hover:bg-menu-hover-bg hover:text-foreground",
    "data-[state=active]:bg-menu-hover-bg data-[state=active]:text-foreground",
    "[&_svg]:text-foreground/55 [&:hover_svg]:text-foreground",
    "[&[data-state=active]_svg]:text-menu-active-fg [&[data-state=active]:hover_svg]:text-menu-active-fg",
    collapsed && "justify-center",
  );
}
