import { LuX } from "react-icons/lu";

import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils/cn";

type ActiveScopeBadgeProps = {
  name: string;
  onClear: () => void;
  className?: string;
  textClassName?: string;
  clearLabel?: string;
};

export default function ActiveScopeBadge({
  name,
  onClear,
  className,
  textClassName,
  clearLabel,
}: ActiveScopeBadgeProps) {
  const t = useT();
  const resolvedTitle = t("smartFolders.scope.activeLabel", { name });
  const resolvedClearLabel = clearLabel ?? t("filters.scope.clearLabel", { name });
  return (
    <div
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary",
        className,
      )}
      title={resolvedTitle}
    >
      <span className={cn("min-w-0 truncate", textClassName)}>{name}</span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClear();
        }}
        aria-label={resolvedClearLabel}
        title={resolvedClearLabel}
        className="hover:bg-primary/15 flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
      >
        <LuX className="h-2.5 w-2.5 shrink-0" />
      </button>
    </div>
  );
}
