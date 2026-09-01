import { type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type BadgeTone =
  | "danger"
  | "info"
  | "neutral"
  | "premium"
  | "progress"
  | "success"
  | "warning";

type BadgePalette = "blue" | "green" | "indigo" | "neutral" | "rose" | "violet" | "amber";

const BADGE_PALETTE_CLASS: Record<BadgePalette, string> = {
  amber: "border-amber-700/50 bg-amber-100 text-amber-700 dark:border-amber-500/50 dark:bg-amber-900/30 dark:text-amber-200",
  blue: "border-blue-700/50 bg-blue-100 text-blue-700 dark:border-blue-500/50 dark:bg-blue-900/30 dark:text-blue-200",
  green: "border-emerald-700/50 bg-emerald-100 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-900/30 dark:text-emerald-200",
  indigo: "border-indigo-700/50 bg-indigo-100 text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-900/30 dark:text-indigo-200",
  neutral: "border-zinc-700/50 bg-zinc-100 text-zinc-700 dark:border-zinc-500/50 dark:bg-zinc-900/30 dark:text-zinc-200",
  rose: "border-rose-700/50 bg-rose-100 text-rose-700 dark:border-rose-500/50 dark:bg-rose-900/30 dark:text-rose-200",
  violet: "border-violet-700/50 bg-violet-100 text-violet-700 dark:border-violet-500/50 dark:bg-violet-900/30 dark:text-violet-200",
};

const BADGE_TONE_PALETTE: Record<BadgeTone, BadgePalette> = {
  danger: "rose",
  info: "blue",
  neutral: "neutral",
  premium: "violet",
  progress: "indigo",
  success: "green",
  warning: "amber",
};

export default function Badge({
  children,
  className,
  tone = "neutral",
  uppercase = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
  uppercase?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        uppercase && "uppercase tracking-wide",
        BADGE_PALETTE_CLASS[BADGE_TONE_PALETTE[tone]],
        className,
      )}
    >
      {children}
    </span>
  );
}
