import { useEffect, useRef, useState, type ReactNode } from "react"

import { useT } from "@/i18n/useT"
import { cn } from "@/lib/utils/cn"
import { CheckIcon, SquarePenIcon, XIcon } from "@/components/icons/Icons"

interface InlineItemEditorProps {
    initialValue: string
    placeholder: string
    onConfirm: (value: string) => void
    onCancel: () => void
    icon?: ReactNode
    isSubmitting?: boolean
    tone?: "neutral" | "danger" | "warning"
    confirmLabel?: string
    cancelLabel?: string
    actionName?: string
    ariaLabel?: string
}

export default function InlineItemEditor({
    initialValue,
    placeholder,
    onConfirm,
    onCancel,
    icon,
    isSubmitting,
    tone = "neutral",
    confirmLabel,
    cancelLabel,
    actionName,
    ariaLabel,
}: InlineItemEditorProps) {
    const t = useT()
    const resolvedConfirmLabel = confirmLabel ?? t("common.confirm")
    const resolvedCancelLabel = cancelLabel ?? t("common.cancel")
    const [value, setValue] = useState(initialValue)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
    }, [])

    const submit = () => {
        const trimmed = value.trim()
        if (!trimmed) return
        onConfirm(trimmed)
    }

    const treeActionButtonClassName =
        "text-text-secondary hover:text-foreground hover:bg-menu-hover-bg flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent p-1 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50"

    return (
        <div
            role="group"
            aria-label={ariaLabel ?? actionName ?? resolvedConfirmLabel}
            className="group flex w-full items-center gap-2 rounded-md border border-foreground/30 bg-menu-hover-bg px-2 py-0.5"
        >
            <span className="h-3.5 w-3.5 shrink-0 text-text-secondary *:h-full *:w-full">
                {icon ?? <SquarePenIcon className="h-3.5 w-3.5" />}
            </span>

            <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                dir="auto"
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault()
                        submit()
                    }
                    if (e.key === "Escape") {
                        e.preventDefault()
                        onCancel()
                    }
                }}
                placeholder={placeholder}
                className="text-foreground placeholder:text-text-secondary/60 w-0 min-w-0 flex-1 bg-transparent text-sm outline-none"
                disabled={isSubmitting}
            />

            <div className="flex shrink-0 items-center gap-0.5">
                <button
                    className={cn(
                        treeActionButtonClassName,
                        tone === "danger" && "text-destructive hover:text-destructive",
                        tone === "warning" &&
                            "text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200",
                    )}
                    onClick={(e) => {
                        e.stopPropagation()
                        submit()
                    }}
                    disabled={isSubmitting}
                    type="button"
                    aria-label={resolvedConfirmLabel}
                >
                    <CheckIcon className="h-3.5 w-3.5" />
                </button>
                <button
                    className={treeActionButtonClassName}
                    onClick={(e) => {
                        e.stopPropagation()
                        onCancel()
                    }}
                    disabled={isSubmitting}
                    type="button"
                    aria-label={resolvedCancelLabel}
                >
                    <XIcon className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
}
