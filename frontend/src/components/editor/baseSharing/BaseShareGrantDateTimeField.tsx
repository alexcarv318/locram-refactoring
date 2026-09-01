import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import type { DropdownProps } from "react-day-picker";
import "react-day-picker/style.css";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils/cn";

function parseIsoDateTime(value: string): Date | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function toLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTime(value: Date): string {
  return `${`${value.getHours()}`.padStart(2, "0")}:${`${value.getMinutes()}`.padStart(2, "0")}`;
}

function combineDateTime(dateValue: string, timeValue: string): string {
  if (!dateValue) {
    return "";
  }
  const effectiveTime = timeValue || "00:00";
  const combined = new Date(`${dateValue}T${effectiveTime}:00`);
  if (Number.isNaN(combined.getTime())) {
    return "";
  }
  return combined.toISOString().replace(".000Z", "Z");
}

function CalendarDropdown({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  disabled,
}: DropdownProps) {
  const selectedOption =
    options?.find((option) => String(option.value) === String(value)) ?? options?.[0];

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
          <span className="text-foreground truncate text-xs">{selectedOption?.label ?? ""}</span>
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

export default function BaseShareGrantDateTimeField({
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
  const [timeValue, setTimeValue] = useState("00:00");
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const parsed = parseIsoDateTime(value);
    return parsed ?? new Date();
  });

  const selectedDate = parseIsoDateTime(value);
  const selectedDateLabel = selectedDate ? toLocalDate(selectedDate) : "";

  useEffect(() => {
    const parsed = parseIsoDateTime(value);
    if (!parsed) {
      return;
    }
    setVisibleMonth(parsed);
    setTimeValue(toLocalTime(parsed));
  }, [value]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} align="left" side="bottom">
      <PopoverTrigger asChild>
        <button
          type="button"
          className="border-border bg-background/40 hover:bg-menu-hover-bg focus:border-menu-active-fg/60 flex h-9 w-full min-w-0 items-center rounded-xl border px-3 text-left text-xs outline-none transition-colors"
          aria-label={placeholder}
        >
          <span className={cn("truncate", value ? "text-foreground" : "text-muted-foreground")}>
            {selectedDate
              ? `${selectedDateLabel} ${timeValue || toLocalTime(selectedDate)}`
              : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] max-w-[calc(100vw-32px)] p-2">
        <div className="space-y-3">
          <DayPicker
            mode="single"
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            selected={selectedDate ?? undefined}
            onSelect={(date) => {
              if (!date) {
                onChange("");
                return;
              }
              onChange(combineDateTime(toLocalDate(date), timeValue));
            }}
            captionLayout="dropdown"
            fromYear={2000}
            toYear={2100}
            showOutsideDays
            components={{ Dropdown: CalendarDropdown }}
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
              day_button:
                "flex h-8 w-8 items-center justify-center rounded-md text-xs transition-colors hover:bg-menu-hover-bg",
              selected: "bg-menu-active-bg text-menu-active-fg hover:bg-menu-active-bg",
              outside: "text-muted-foreground",
              today: "text-primary font-semibold",
            }}
          />

          <label className="grid gap-1">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
              {t("sharing.owner.dateTime.time")}
            </span>
            <input
              type="time"
              value={timeValue}
              onChange={(event) => {
                const nextTime = event.target.value;
                setTimeValue(nextTime);
                if (selectedDate) {
                  onChange(combineDateTime(toLocalDate(selectedDate), nextTime));
                }
              }}
              className="border-border bg-background text-foreground h-9 rounded-xl border px-3 text-sm outline-none"
            />
          </label>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="text-text-secondary hover:text-foreground hover:bg-menu-hover-bg rounded-md px-2 py-1 text-xs transition-colors"
            >
              {t("sharing.owner.dateTime.clear")}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(combineDateTime(toLocalDate(new Date()), toLocalTime(new Date())));
                setIsOpen(false);
              }}
              className="text-text-secondary hover:text-foreground hover:bg-menu-hover-bg rounded-md px-2 py-1 text-xs transition-colors"
            >
              {t("sharing.owner.dateTime.now")}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
