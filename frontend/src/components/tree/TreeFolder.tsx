import { type MouseEvent, type ReactNode } from "react"

import { useT } from "@/i18n/useT"
import { cn } from "@/lib/utils/cn"

import { ArrowLeftIcon } from "@/components/icons/Icons"
import { useMarqueeLabel } from "@/components/tree/TreeMarqueeLabel"

interface TreeFolderProps {
    label: string
    count: number
    isActive?: boolean
    isExpanded: boolean
    onToggle?: () => void
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void
    children?: ReactNode
    emptyMessage?: string
    icon?: ReactNode
    actions?: ReactNode
    alwaysShowActions?: boolean
}

export default function TreeFolder({
    label,
    count,
    isActive = false,
    isExpanded,
    onToggle,
    onClick,
    children,
    emptyMessage,
    icon,
    actions,
    alwaysShowActions = false,
}: TreeFolderProps) {
    const t = useT();
    const marquee = useMarqueeLabel(label);
    const hasToggle = typeof onToggle === "function";

    return (
        <div className="mb-1">
            <div
                {...marquee.rowMouseHandlers}
                data-active-tree-item={isActive ? "" : undefined}
                className={cn(
                "group flex w-full items-center gap-2 rounded-md px-2 py-1 text-start text-sm leading-none font-normal tracking-wider transition-colors",
                isActive
                    ? "bg-menu-hover-bg text-foreground border border-foreground/30"
                    : "text-foreground hover:bg-menu-hover-bg border border-transparent",
            )}>
                {hasToggle ? (
                    <button
                        aria-label={t("tree.item.toggle", { label })}
                        className="flex shrink-0 cursor-pointer items-center justify-center"
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggle()
                        }}
                        type="button"
                    >
                        <ArrowLeftIcon
                            className={cn(
                                "text-text-secondary h-3 w-3 shrink-0 rotate-180 transition-transform rtl:-scale-x-100",
                                isExpanded && "rotate-270",
                            )}
                        />
                    </button>
                ) : null}
                <button
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-start"
                    onClick={(e) => {
                        e.stopPropagation()
                        onClick?.(e)
                    }}
                    type="button"
                >
                    {icon && (
                        <span className={cn(
                            "h-3.5 w-3.5 shrink-0 *:h-full *:w-full",
                            isActive ? "text-menu-active-fg" : "text-primary",
                        )}>
                            {icon}
                        </span>
                    )}
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <span
                            ref={marquee.labelRef}
                            className={marquee.labelClassName}
                            style={marquee.labelStyle}
                        >
                            {label}
                        </span>
                    </div>
                </button>
                <div className="flex shrink-0 items-center">
                    <span className={cn(
                        "bg-foreground/10 text-foreground flex h-5 min-w-5 items-center justify-center rounded-sm px-1.5 text-xs font-medium transition-opacity",
                        actions && !alwaysShowActions ? "group-hover:opacity-0 group-hover:w-0 group-hover:min-w-0 group-hover:overflow-hidden group-hover:px-0" : "",
                    )}>
                        {count}
                    </span>
                    {actions && (
                        <span className={cn(
                            "flex items-center gap-0.5 transition-all",
                            alwaysShowActions
                                ? "ms-1"
                                : "w-0 overflow-hidden opacity-0 group-hover:w-auto group-hover:opacity-100",
                        )}>
                            {actions}
                        </span>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="mt-1 ms-5 space-y-0.5">
                    {children || (hasToggle ? (
                        <p className="text-text-secondary px-2 py-4 text-center text-xs">
                            {emptyMessage ?? t("tree.folder.emptyDefault", { label })}
                        </p>
                    ) : null)}
                </div>
            )}
        </div>
    )
}
