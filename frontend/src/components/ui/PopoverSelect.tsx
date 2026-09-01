import { useState } from "react";
import { LuChevronDown } from "react-icons/lu";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { cn } from "@/lib/utils/cn";

export type PopoverSelectOption<T extends string> = {
  label: string;
  value: T;
};

export type PopoverSelectProps<T extends string> = {
  ariaLabel: string;
  options: PopoverSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  id?: string;
  title?: string;
  triggerClassName?: string;
  contentClassName?: string;
  align?: "left" | "right" | "center";
  side?: "top" | "bottom";
};

export default function PopoverSelect<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  disabled = false,
  id,
  title,
  triggerClassName,
  contentClassName,
  align = "right",
  side = "bottom",
}: PopoverSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <Popover open={open} onOpenChange={setOpen} align={align} side={side}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          title={title ?? ariaLabel}
          disabled={disabled}
          className={cn(
            "border-border bg-background/40 flex h-9 min-w-[160px] items-center justify-between gap-2 rounded-xl border px-3 text-left transition-colors",
            disabled
              ? "text-muted-foreground cursor-not-allowed opacity-60"
              : "hover:bg-menu-hover-bg text-foreground",
            triggerClassName,
          )}
        >
          <span className="text-foreground truncate text-xs font-medium">
            {selectedOption?.label ?? ""}
          </span>
          <LuChevronDown className="text-text-secondary h-3.5 w-3.5 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[var(--popover-trigger-width)] min-w-[var(--popover-trigger-width)] p-1",
          contentClassName,
        )}
      >
        <div role="listbox" className="space-y-1">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={isSelected}
                data-value={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full rounded-md px-2 py-2 text-left text-sm",
                  isSelected
                    ? "bg-menu-hover-bg text-foreground"
                    : "text-foreground hover:bg-menu-hover-bg",
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
