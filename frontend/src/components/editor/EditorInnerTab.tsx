import type { MouseEvent } from "react"

import { XIcon } from "@/components/icons/Icons"

export interface EditorTabProps {
    id: string
    label: string
    active: boolean
    icon?: React.ReactNode
    modified?: boolean
    externalUpdatePending?: boolean
    externalUpdatePendingTitle?: string
    onSelect: (id: string) => void
    onClose: (id: string) => void
    onContextMenu?: (id: string, event: MouseEvent<HTMLDivElement>) => void
}

export default function EditorInnerTab({
    id,
    label,
    active,
    icon,
    modified = false,
    externalUpdatePending = false,
    externalUpdatePendingTitle,
    onSelect,
    onClose,
    onContextMenu,
}: EditorTabProps) {
    const handleClose = (event: MouseEvent) => {
        event.stopPropagation()
        onClose(id)
    }

    return (
        <div
            aria-label={label}
            aria-selected={active}
            className={`border-border group flex h-9 cursor-pointer items-center gap-2 border-r pr-1 pl-3 ${
                active
                    ? "bg-background border-b-menu-active-fg text-foreground border-b-2"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
            onClick={() => onSelect(id)}
            onContextMenu={(event) => {
                if (!onContextMenu) {
                    return;
                }
                event.preventDefault();
                onContextMenu(id, event);
            }}
            role="tab"
        >
            {icon && <div className="shrink-0">{icon}</div>}
            {modified ? <span aria-hidden="true" className="bg-primary h-2 w-2 shrink-0 rounded-full" /> : null}
            {externalUpdatePending ? (
                <span
                    aria-hidden="true"
                    className="bg-amber-500 h-2 w-2 shrink-0 rounded-full"
                    title={externalUpdatePendingTitle}
                />
            ) : null}
            <span className="max-w-[120px] truncate text-sm">{label}</span>
            <button
                className="group/btn hover:bg-menu-hover-bg shrink-0 cursor-pointer rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={handleClose}
                aria-label={`Close ${label}`}
            >
                <XIcon className="group-hover/btn:text-menu-hover-fg h-3.5 w-3.5" />
            </button>
        </div>
    )
}
