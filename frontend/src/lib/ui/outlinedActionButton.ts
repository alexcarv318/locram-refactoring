import { cn } from "@/lib/utils/cn";

export const OUTLINED_ACTION_BUTTON_LAYOUT_CLASS =
  "flex items-center justify-center gap-2 border font-medium whitespace-nowrap transition";

export const OUTLINED_ACTION_BUTTON_ENABLED_CLASS = cn(
  "border-foreground/30 bg-background text-foreground/80",
  "hover:border-foreground/55 hover:bg-menu-hover-bg hover:text-foreground",
);

export const OUTLINED_ACTION_BUTTON_DISABLED_CLASS =
  "border-foreground/15 bg-muted/20 text-foreground/40 cursor-not-allowed opacity-70";

export type OutlinedActionButtonSize = "sm" | "xs" | "compact";

const OUTLINED_ACTION_BUTTON_SIZE_CLASS: Record<OutlinedActionButtonSize, string> = {
  sm: "rounded-lg px-3 py-2 text-sm",
  xs: "rounded-lg px-3 py-2 text-xs",
  compact: "rounded-md px-2 py-0.5 text-[10px]",
};

export function outlinedActionButtonClassName(
  disabled = false,
  size: OutlinedActionButtonSize = "sm",
): string {
  return cn(
    OUTLINED_ACTION_BUTTON_LAYOUT_CLASS,
    OUTLINED_ACTION_BUTTON_SIZE_CLASS[size],
    disabled ? OUTLINED_ACTION_BUTTON_DISABLED_CLASS : OUTLINED_ACTION_BUTTON_ENABLED_CLASS,
  );
}
