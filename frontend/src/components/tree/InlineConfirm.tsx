import { useT } from "@/i18n/useT"
import { cn } from "@/lib/utils/cn"
import type { ReactNode } from "react"

import { CheckIcon, DeleteIcon, XIcon } from "@/components/icons/Icons"

interface InlineConfirmProps {
    label: string
    onConfirm: () => void
    onCancel: () => void
    isSubmitting?: boolean
    tone?: "danger" | "neutral" | "warning"
    icon?: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    actionName?: string
    subjectName?: string
    subjectIcon?: ReactNode
}

export default function InlineConfirm({
    label,
    onConfirm,
    onCancel,
    isSubmitting,
    tone = "neutral",
    icon,
    confirmLabel,
    cancelLabel,
    actionName,
    subjectName,
    subjectIcon,
}: InlineConfirmProps) {
    const t = useT()
    const defaultConfirmIcon =
        tone === "danger" ? (
            <DeleteIcon className="h-3.5 w-3.5" />
        ) : (
            <CheckIcon className="h-3.5 w-3.5" />
        )
    const resolvedConfirmLabel =
        confirmLabel ?? (tone === "danger" ? t("common.delete") : t("common.confirm"))
    const resolvedCancelLabel = cancelLabel ?? t("common.cancel")
    const visibleActionName = actionName ?? resolvedConfirmLabel
    const normalizedSubjectName = subjectName?.trim() ?? ""
    const normalizedLabel = label.trim()
    const hasSubjectName = normalizedSubjectName !== ""
    const primaryLine = hasSubjectName ? normalizedSubjectName : normalizedLabel

    const treeActionButtonClassName =
        "text-text-secondary hover:text-foreground hover:bg-menu-hover-bg flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent p-1 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50"

    return (
        <div
            role="group"
            aria-label={normalizedLabel}
            title={normalizedLabel}
            className="group flex w-full items-center gap-2 rounded-md border border-foreground/30 bg-menu-hover-bg px-2 py-0.5"
        >
            {subjectIcon ? (
                <span className="h-3.5 w-3.5 shrink-0 text-text-secondary *:h-full *:w-full">
                    {subjectIcon}
                </span>
            ) : null}
            <div className="min-w-0 flex-1 overflow-hidden">
                <span className="block truncate text-start text-sm">{primaryLine}</span>
            </div>
            <span
                className={cn(
                    "shrink-0 text-sm",
                    tone === "danger"
                        ? "text-destructive"
                        : tone === "warning"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-text-secondary",
                )}
            >
                {visibleActionName}
            </span>
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
                        onConfirm()
                    }}
                    disabled={isSubmitting}
                    type="button"
                    aria-label={resolvedConfirmLabel}
                >
                    {icon ?? defaultConfirmIcon}
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
