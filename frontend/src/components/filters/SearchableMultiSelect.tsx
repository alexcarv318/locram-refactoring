import { useMemo, useState } from "react";
import { LuChevronDown, LuSearch, LuX } from "react-icons/lu";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils/cn";

type SearchableMultiSelectProps = {
  emptyLabel: string;
  hideSelectedValues?: boolean;
  placeholder?: string;
  selectedValues: string[];
  title: string;
  values: string[];
  onSetAll?: (values: string[]) => void;
  onToggle: (value: string) => void;
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

export default function SearchableMultiSelect({
  emptyLabel,
  hideSelectedValues = false,
  placeholder,
  selectedValues,
  title,
  values,
  onSetAll,
  onToggle,
}: SearchableMultiSelectProps) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const resolvedPlaceholder = placeholder ?? title;
  const searchAriaLabel = t("filters.multiSelect.searchAria", { field: title });
  const clearAriaLabel = t("filters.multiSelect.clearSearchAria", { field: title });

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const filteredValues = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = normalized
      ? values.filter((value) => value.toLowerCase().includes(normalized))
      : values;

    return [...matches].sort((left, right) => left.localeCompare(right));
  }, [query, values]);

  const allSelected = values.length > 0 && values.every((value) => selectedSet.has(value));

  return (
    <div className="w-full min-w-0 space-y-1">
      <div className="flex min-h-3 items-center justify-between gap-3">
        <div className="text-text-secondary text-[10px] font-medium tracking-[0.14em] uppercase">{title}</div>
        {onSetAll ? (
          <button
            type="button"
            onClick={() => onSetAll(allSelected ? [] : [...values])}
            className="text-text-secondary hover:text-foreground hover:bg-menu-hover-bg rounded-md px-2 py-1 text-[10px] transition-colors"
          >
            {allSelected
              ? t("filters.multiSelect.clear")
              : t("filters.multiSelect.all")}
          </button>
        ) : null}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen} align="left" side="bottom">
        <PopoverTrigger asChild>
          <button
            type="button"
            className="border-border bg-background/40 hover:bg-menu-hover-bg flex h-9 w-full items-center justify-between rounded-xl border px-3 text-left transition-colors"
            aria-label={searchAriaLabel}
          >
            <div className="flex min-w-0 items-center gap-2">
              <LuSearch className="text-text-secondary h-3.5 w-3.5 shrink-0" />
              <span className="text-text-secondary truncate text-xs">
                {resolvedPlaceholder}
              </span>
            </div>
            <LuChevronDown className="text-text-secondary h-3.5 w-3.5 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(480px,calc(100vw-32px))] p-0">
          <div className="flex flex-col">
            <div className="border-border flex items-center gap-2 border-b px-3 py-2">
              <LuSearch className="text-text-secondary h-3.5 w-3.5 shrink-0" />
              <input
                autoFocus
                className="text-foreground placeholder:text-text-secondary w-full border-none bg-transparent text-sm outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={resolvedPlaceholder}
                type="text"
                value={query}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-text-secondary hover:text-foreground rounded-md p-1 transition-colors"
                  aria-label={clearAriaLabel}
                >
                  <LuX className="h-3 w-3" />
                </button>
              ) : null}
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredValues.length > 0 ? (
                <div className="space-y-1">
                  {filteredValues.map((value) => {
                    const selected = selectedSet.has(value);
                    return (
                      <button
                        type="button"
                        key={`${title}:option:${value}`}
                        onClick={() => onToggle(value)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors",
                          selected
                            ? "bg-menu-hover-bg text-foreground"
                            : "text-foreground hover:bg-menu-hover-bg",
                        )}
                      >
                        <span className="truncate">{formatLabel(value)}</span>
                        <span
                          className={cn(
                            "ms-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                            selected
                              ? "bg-menu-active-bg text-menu-active-fg"
                              : "bg-panel-muted text-text-secondary",
                          )}
                        >
                          {selected
                            ? t("filters.multiSelect.added")
                            : t("filters.multiSelect.add")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-text-secondary px-2 py-4 text-sm">
                  {t("filters.multiSelect.noMatches")}
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hideSelectedValues ? null : (
        <div className="border-border bg-background/40 flex min-h-12 w-full min-w-0 flex-wrap gap-1.5 rounded-xl border px-2 py-2">
          {selectedValues.length > 0 ? (
            selectedValues.map((value) => (
              <button
                type="button"
                key={`${title}:selected:${value}`}
                onClick={() => onToggle(value)}
                className="bg-menu-hover-bg text-foreground inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
              >
                <span>{formatLabel(value)}</span>
                <LuX className="h-3 w-3" />
              </button>
            ))
          ) : (
            <span className="text-text-secondary text-xs">{emptyLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
