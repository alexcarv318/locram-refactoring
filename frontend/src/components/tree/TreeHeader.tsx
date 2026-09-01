import { useState, type ReactNode } from "react"

import { useT } from "@/i18n/useT"
import { cn } from "@/lib/utils/cn"

import { ArrowLeftIcon } from "@/components/icons/Icons"

interface TreeHeaderBaseProps {
    title: string
    actions?: ReactNode
    children?: ReactNode
    status?: ReactNode
    uppercaseTitle?: boolean
}

interface TreeHeaderUncontrolledProps extends TreeHeaderBaseProps {
    defaultExpanded?: boolean
    expanded?: never
    onToggle?: never
}

interface TreeHeaderControlledProps extends TreeHeaderBaseProps {
    expanded: boolean
    onToggle: () => void
    defaultExpanded?: never
}

type TreeHeaderProps = TreeHeaderUncontrolledProps | TreeHeaderControlledProps

export default function TreeHeader({ title, actions, children, status, uppercaseTitle = true, ...rest }: TreeHeaderProps) {
    const t = useT()
    const isControlled = "expanded" in rest && rest.expanded !== undefined
    const [internalExpanded, setInternalExpanded] = useState(
        isControlled ? false : ((rest as TreeHeaderUncontrolledProps).defaultExpanded ?? true),
    )

    const expanded = isControlled ? (rest as TreeHeaderControlledProps).expanded : internalExpanded
    const handleToggle = isControlled
        ? (rest as TreeHeaderControlledProps).onToggle
        : () => setInternalExpanded((prev) => !prev)

    return (
        <>
            <div className="border-border flex items-center justify-between gap-2 px-3 pt-2">
                <button
                    aria-label={t("tree.header.toggleSection", { title })}
                    onClick={handleToggle}
                    className="hover:text-foreground flex cursor-pointer items-center gap-2 text-start transition-colors"
                >
                    <ArrowLeftIcon
                        className={cn(
                            "text-text-secondary h-3 w-3 shrink-0 rotate-180 transition-transform rtl:-scale-x-100",
                            expanded && "rotate-270",
                        )}
                    />
                    <span className={cn("text-foreground text-xs font-semibold tracking-wider", uppercaseTitle && "uppercase")}>
                        {title}
                    </span>
                </button>
                {(status || actions) && (
                    <div className="flex min-w-0 items-center gap-1">
                        {status}
                        {actions && <div className="flex items-center gap-0.5">{actions}</div>}
                    </div>
                )}
            </div>
            {expanded && children}
        </>
    )
}
