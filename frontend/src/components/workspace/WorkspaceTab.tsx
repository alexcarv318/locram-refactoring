import type { ReactNode } from "react"

import { useShellLayoutStore } from "@/stores/shellLayoutStore"

import WorkspaceResizeHandle from "./WorkspaceResizeHandle"

interface WorkspaceTabProps {
    id: string
    isLast: boolean
    children: ReactNode
}

export default function WorkspaceTab({ id, isLast, children }: WorkspaceTabProps) {
    const { tabs, resizeTabWithNeighbor, isTransitioning } = useShellLayoutStore()
    const tab = tabs.find((t) => t.id === id)

    if (!tab) return null

    const handleResize = (newWidth: number) => {
        resizeTabWithNeighbor(id, newWidth)
    }

    const animatedWidth = tab.isVisible ? tab.width : 0

    return (
        <div
            data-tab-id={id}
            style={{
                width: `${animatedWidth}px`,
                transition: isTransitioning ? "width 350ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
            }}
            className="bg-card relative h-full shrink-0 overflow-hidden"
        >
            <div
                className="h-full w-full overflow-hidden"
                style={{
                    opacity: tab.isVisible ? 1 : 0,
                    transition: isTransitioning ? "opacity 250ms ease" : undefined,
                }}
            >
                {children}
            </div>

            {tab.isVisible && !isLast && <WorkspaceResizeHandle side="end" onResize={handleResize} tabId={id} />}
        </div>
    )
}
