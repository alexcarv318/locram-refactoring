import { type MouseEvent, type ReactNode } from "react"

import { useT } from "@/i18n/useT"
import { cn } from "@/lib/utils/cn"

import { ArrowLeftIcon } from "@/components/icons/Icons"
import { useMarqueeLabel } from "@/components/tree/TreeMarqueeLabel"

interface TreeItemProps {
    icon: ReactNode
    label: string
    supporting?: ReactNode
    isActive: boolean
    isIconActive?: boolean
    onClick: (event: MouseEvent<HTMLButtonElement>) => void
    actions?: ReactNode
    countIndicator?: ReactNode
    count?: number
    hideZeroCount?: boolean
    isExpanded?: boolean
    onToggle?: () => void
    children?: ReactNode
}

export default function TreeItem({ icon, label, supporting, isActive, isIconActive, onClick, actions, countIndicator, count, hideZeroCount = true, isExpanded, onToggle, children }: TreeItemProps) {
    const t = useT();
    const hasChildren = onToggle !== undefined;
    const showsCount = count !== undefined;
    const marquee = useMarqueeLabel(label);
    const effectiveIconActive = isIconActive ?? isActive;

    return (
        <div className="mb-0.5">
            <div
                {...marquee.rowMouseHandlers}
                data-active-tree-item={isActive ? "" : undefined}
                className={cn(
                    "group flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-0.5 transition-colors duration-150 ease-in-out",
                    isActive
                        ? "bg-menu-hover-bg text-foreground border-foreground/30"
                        : "text-foreground hover:bg-menu-hover-bg",
                )}
            >
                {hasChildren ? (
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
                    onClick={(event) => {
                        event.stopPropagation()
                        onClick(event)
                    }}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-start"
                >
                    <span
                        className={cn(
                            "h-3.5 w-3.5 shrink-0 *:h-full *:w-full",
                            effectiveIconActive ? "text-menu-active-fg" : "text-text-secondary group-hover:text-menu-hover-fg",
                        )}
                    >
                        {icon}
                    </span>
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <span
                            ref={marquee.labelRef}
                            className={cn(marquee.labelClassName, "text-sm")}
                            style={marquee.labelStyle}
                        >
                            {label}
                        </span>
                        {supporting ? (
                            <div className="mt-0.5 truncate text-[11px] text-text-secondary">
                                {supporting}
                            </div>
                        ) : null}
                    </div>
                </button>

                <div className="flex shrink-0 items-center">
                    {showsCount ? (
                        <>
                            {countIndicator ? (
                                <span className="me-1 flex items-center">
                                    {countIndicator}
                                </span>
                            ) : null}
                            <span className={cn(
                                "bg-foreground/10 text-foreground flex h-5 min-w-5 items-center justify-center rounded-sm px-1.5 text-xs font-medium transition-opacity",
                                count === 0 && hideZeroCount ? "opacity-0" : "",
                                actions ? "group-hover:opacity-0 group-hover:w-0 group-hover:min-w-0 group-hover:overflow-hidden group-hover:px-0" : "",
                            )}>
                                {count}
                            </span>
                            {actions && (
                                <span className="flex w-0 items-center gap-0.5 overflow-hidden opacity-0 transition-all group-hover:w-auto group-hover:opacity-100">
                                    {actions}
                                </span>
                            )}
                        </>
                    ) : (
                        actions && (
                            <span className="flex w-0 items-center gap-0.5 overflow-hidden opacity-0 transition-all group-hover:w-auto group-hover:opacity-100">
                                {actions}
                            </span>
                        )
                    )}
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="mt-0.5 ms-5 space-y-0.5">
                    {children}
                </div>
            )}
        </div>
    )
}
