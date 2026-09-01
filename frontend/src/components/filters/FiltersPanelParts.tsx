import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import type { DropdownProps } from "react-day-picker";
import "react-day-picker/style.css";

import { Checkbox } from "@/components/ui/Checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { SelectAllIcon, XIcon } from "@/components/icons/Icons";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/i18n/useT";
import type { Translator } from "@/i18n/translate";
import {
  localizeLinkType,
  localizePageStatus,
  localizePageType,
} from "@/i18n/domainLabels";

export type CheckboxGridCategory = "type" | "status" | "link" | "raw";

export type DateFieldCardProps = {
  title: string;
  from: string;
  to: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
};

export type CheckboxGridProps = {
  columns?: number;
  minColumnWidth?: number;
  title: string;
  category?: CheckboxGridCategory;
  values: string[];
  availableValues: string[];
  selectedValues: string[];
  onSetAll: (values: string[]) => void;
};

function formatRawFilterLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatFilterValueLabel(
  value: string,
  category: CheckboxGridCategory,
  t: Translator,
): string {
  if (category === "type") {
    return localizePageType(value, t);
  }
  if (category === "status") {
    return localizePageStatus(value, t);
  }
  if (category === "link") {
    return localizeLinkType(value, t);
  }
  return formatRawFilterLabel(value);
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function CalendarDropdown({ options, value, onChange, "aria-label": ariaLabel, disabled }: DropdownProps) {
  const selectedOption = options?.find((option) => String(option.value) === String(value)) ?? options?.[0];

  function handleSelect(nextValue: number) {
    onChange?.({
      target: { value: String(nextValue) },
    } as React.ChangeEvent<HTMLSelectElement>);
  }

  return (
    <Popover align="left" side="bottom">
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "border-border bg-background/40 hover:bg-menu-hover-bg flex h-9 w-full items-center justify-between rounded-xl border px-3 text-left transition-colors",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <span className="truncate text-xs text-foreground">{selectedOption?.label ?? ""}</span>
          <span className="text-text-secondary h-3.5 w-3.5 shrink-0">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--popover-trigger-width)] p-1">
        <div className="space-y-1">
          {options?.map((option) => {
            const isSelected = String(option.value) === String(value);
            return (
              <button
                type="button"
                key={option.value}
                disabled={option.disabled}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "flex w-full rounded-md px-2 py-2 text-left text-sm transition-colors",
                  isSelected
                    ? "bg-menu-hover-bg text-foreground"
                    : "text-foreground hover:bg-menu-hover-bg",
                  option.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DatePopoverField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const parsed = parseIsoDate(value);
    return startOfMonth(parsed ?? new Date());
  });
  const selectedDate = parseIsoDate(value);

  useEffect(() => {
    const parsed = parseIsoDate(value);
    if (parsed) {
      setVisibleMonth(startOfMonth(parsed));
    }
  }, [value]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} align="left" side="bottom">
      <PopoverTrigger asChild>
        <button
          type="button"
          className="border-input bg-background placeholder:text-muted-foreground focus:border-menu-active-fg/60 flex h-8 w-full min-w-0 items-center rounded-md border px-2 text-left text-xs outline-none sm:px-2"
          aria-label={placeholder}
        >
          <span className={cn("truncate", value ? "text-foreground" : "text-muted-foreground")}>
            {value || placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] max-w-[calc(100vw-32px)] p-2">
        <div className="space-y-2">
          <DayPicker
            mode="single"
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            selected={selectedDate ?? undefined}
            onSelect={(date) => {
              onChange(date ? toIsoDate(date) : "");
              setIsOpen(false);
            }}
            captionLayout="dropdown"
            fromYear={2000}
            toYear={2100}
            showOutsideDays
            components={{
              Dropdown: CalendarDropdown,
            }}
            className="rdp-root [--rdp-day-width:2rem] [--rdp-day-height:2rem] [--rdp-day_button-width:2rem] [--rdp-day_button-height:2rem] [--rdp-dropdown-gap:0.5rem]"
            classNames={{
              root: "rdp-root",
              months: "w-full",
              month: "w-full",
              month_caption: "mb-2 flex items-center justify-center",
              dropdowns: "grid w-full grid-cols-[minmax(0,1fr)_88px] gap-2",
              dropdown_root: "w-full",
              months_dropdown: "w-full",
              years_dropdown: "w-full",
              caption_label: "hidden",
              chevron: "hidden",
              nav: "hidden",
              month_grid: "w-full border-collapse",
              weekdays: "grid grid-cols-7",
              weekday: "text-text-secondary p-1 text-center text-[10px] font-medium uppercase",
              week: "mt-1 grid grid-cols-7",
              day: "flex items-center justify-center",
              day_button: "flex h-8 w-8 items-center justify-center rounded-md text-xs transition-colors hover:bg-menu-hover-bg",
              selected: "bg-menu-active-bg text-menu-active-fg hover:bg-menu-active-bg",
              outside: "text-muted-foreground",
              today: "text-primary font-semibold",
            }}
          />

          <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-text-secondary hover:text-foreground hover:bg-menu-hover-bg rounded-md px-2 py-1 text-xs transition-colors"
              >
                {t("common.clear")}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(toIsoDate(new Date()));
                  setIsOpen(false);
                }}
                className="text-text-secondary hover:text-foreground hover:bg-menu-hover-bg rounded-md px-2 py-1 text-xs transition-colors"
              >
                {t("common.today")}
              </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CheckboxGrid({
  title,
  category = "raw",
  values,
  availableValues,
  selectedValues,
  onSetAll,
  columns = 3,
  minColumnWidth = 120,
}: CheckboxGridProps) {
  const t = useT();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const availableSet = new Set(availableValues);
  const selectedSet = new Set(selectedValues);
  const allExplicitlySelected =
    availableValues.length > 0 &&
    availableValues.every((value) => selectedSet.has(value));

  function handleToggle(value: string) {
    const next = selectedValues.includes(value)
      ? selectedValues.filter((item) => item !== value)
      : [...selectedValues, value];
    onSetAll(next);
  }

  function handleSelectOrClear() {
    onSetAll(allExplicitlySelected ? [] : [...availableValues]);
  }

  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) {
      return;
    }

    const updateWidth = () => {
      setGridWidth(gridElement.clientWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(gridElement);

    return () => observer.disconnect();
  }, []);

  const effectiveColumns =
    gridWidth > 0 ? Math.max(1, Math.min(columns, Math.floor(gridWidth / minColumnWidth))) : columns;

  return (
    <fieldset className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-6 items-center gap-2">
          <button
            type="button"
            onClick={handleSelectOrClear}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
              allExplicitlySelected ? "text-destructive hover:text-destructive/80" : "text-primary hover:text-primary/80",
            )}
            title={allExplicitlySelected ? t("filters.clearSelection") : t("filters.selectAll")}
            aria-label={
              allExplicitlySelected
                ? t("filters.clearGroupAria", { title })
                : t("filters.selectAllGroupAria", { title })
            }
          >
            <SelectAllIcon className="h-3.5 w-3.5" />
          </button>
          <span className="text-foreground/80 text-[10px] leading-none font-medium tracking-[0.14em] uppercase">
            {title}
          </span>
        </div>
      </div>
      <div
        ref={gridRef}
        className="grid gap-x-3 gap-y-1"
        style={{ gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))` }}
      >
        {values.map((value) => {
          const disabled = !availableSet.has(value);
          const checked = selectedSet.has(value);
          const checkboxId = `${title.replace(/\s+/g, "-").toLowerCase()}-${value}`;
          const localizedLabel = formatFilterValueLabel(value, category, t);

          return (
            <label
              htmlFor={checkboxId}
              className={cn(
                "flex min-h-6 items-center gap-2 px-0.5 text-xs transition-colors",
                disabled ? "cursor-not-allowed" : "cursor-pointer",
                disabled ? "text-muted-foreground/60" : "text-foreground",
              )}
              key={`${title}:${value}`}
            >
              <Checkbox
                id={checkboxId}
                aria-label={localizedLabel}
                checked={checked}
                disabled={disabled}
                onCheckedChange={() => handleToggle(value)}
              />
              <span className={cn("whitespace-nowrap", disabled && "text-muted-foreground/60")}>
                {localizedLabel}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function DateFieldCard({ title, from, to, onChangeFrom, onChangeTo }: DateFieldCardProps) {
  const t = useT();
  const hasValue = Boolean(from || to);

  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <div className="text-foreground/80 text-[9px] font-medium tracking-[0.14em] uppercase">{title}</div>
        <button
          type="button"
          onClick={() => {
            onChangeFrom("");
            onChangeTo("");
          }}
          disabled={!hasValue}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
            hasValue
              ? "text-destructive hover:text-destructive/80"
              : "text-muted-foreground/40 cursor-not-allowed",
          )}
          title={t("filters.clearDateRange")}
          aria-label={t("filters.clearDateRangeAria", { title })}
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <DatePopoverField value={from} onChange={onChangeFrom} placeholder={t("filters.selectStartDate")} />
        <DatePopoverField value={to} onChange={onChangeTo} placeholder={t("filters.selectEndDate")} />
      </div>
    </section>
  );
}
