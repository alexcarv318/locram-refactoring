import * as React from "react";

import { cn } from "@/lib/utils/cn";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, size = "md", ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      onCheckedChange?.(event.target.checked);
    };

    const trackSizeClass = size === "sm" ? "h-5 w-9" : size === "lg" ? "h-7 w-14" : "h-6 w-11";
    const thumbSizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
    const thumbTranslateCheckedClass =
      size === "sm"
        ? "ltr:translate-x-4 rtl:-translate-x-4"
        : size === "lg"
          ? "ltr:translate-x-7 rtl:-translate-x-7"
          : "ltr:translate-x-5 rtl:-translate-x-5";

    return (
      <label
        className={cn(
          "peer focus-within:ring-ring focus-within:ring-offset-background relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-none",
          trackSizeClass,
          checked ? "border-menu-active-fg bg-menu-active-fg" : "border-border bg-muted shadow-inner",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <input
          {...props}
          ref={ref}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="absolute inset-0 m-0 h-full w-full cursor-inherit opacity-0"
        />
        <span
          className={cn(
            "pointer-events-none block rounded-full shadow-lg ring-0 transition-transform",
            thumbSizeClass,
            checked ? "bg-white" : "bg-muted-foreground/80 dark:bg-muted-foreground",
            checked ? thumbTranslateCheckedClass : "translate-x-0",
          )}
        />
      </label>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };
