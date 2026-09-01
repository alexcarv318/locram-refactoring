import type React from "react"

import { cn } from "@/lib/utils/cn"

import { CheckIcon } from "@/components/icons/Icons"

interface CheckboxProps {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
}

export function Checkbox({
    checked,
    onCheckedChange,
    className,
    disabled,
    onChange,
    ...props
}: Omit<React.ComponentPropsWithoutRef<"input">, "type" | "checked" | "onChange"> &
    CheckboxProps & {
        disabled?: boolean
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    }) {
    return (
        <span className={cn("relative inline-flex items-center", disabled && "cursor-not-allowed")}>
            <input
                {...props}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => {
                    onChange?.(e)
                    onCheckedChange(e.target.checked)
                }}
                className="peer absolute inset-0 m-0 h-4 w-4 cursor-pointer opacity-0"
            />
            <span
                className={cn(
                    "border-border bg-background inline-flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors peer-focus-visible:outline-none",
                    checked && "border-transparent bg-transparent text-primary",
                    disabled ? "opacity-50" : "cursor-pointer",
                    className,
                )}
            >
                <CheckIcon className={cn("h-3 w-3", checked ? "opacity-100" : "opacity-0")} />
            </span>
        </span>
    )
}
