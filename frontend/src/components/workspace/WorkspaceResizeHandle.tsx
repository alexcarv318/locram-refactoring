import { useRef } from "react"
import type { MouseEvent } from "react"

import { useDirection } from "@/providers/direction-provider"

interface WorkspaceResizeHandleProps {
    onResize: (newWidth: number) => void
    disabled?: boolean
    side: "start" | "end"
    tabId: string
}

export default function WorkspaceResizeHandle({ onResize, disabled = false, side, tabId }: WorkspaceResizeHandleProps) {
    const { resolvedDirection } = useDirection()
    const isResizingRef = useRef(false)
    const animationFrameRef = useRef<number | null>(null)
    const startXRef = useRef(0)
    const startWidthRef = useRef(0)

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (disabled) return

        e.preventDefault()
        e.stopPropagation()

        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement
        if (!tabElement) return

        isResizingRef.current = true
        startXRef.current = e.clientX
        startWidthRef.current = tabElement.getBoundingClientRect().width

        tabElement.style.transition = "none"
        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"

        // Under RTL with flex-direction:row, the next DOM sibling visually sits
        // on the start (visual left) side of the current tab. The handle is
        // rendered on the logical end edge, which visually maps to the left
        // under RTL, so mouse-right motion has to shrink, not grow, the tab.
        const directionMultiplier = resolvedDirection === "rtl" ? -1 : 1

        const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
            if (!isResizingRef.current) return

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }

            animationFrameRef.current = requestAnimationFrame(() => {
                const deltaX = (moveEvent.clientX - startXRef.current) * directionMultiplier
                const newWidth = startWidthRef.current + deltaX
                const constrainedWidth = Math.max(200, newWidth)
                onResize(constrainedWidth)
            })
        }

        const handleMouseUp = () => {
            isResizingRef.current = false

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }

            if (tabElement) {
                tabElement.style.transition = ""
            }

            document.body.style.cursor = ""
            document.body.style.userSelect = ""
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
        }

        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
    }

    if (disabled) return null

    return (
        <div
            data-resize-side={side}
            onMouseDown={handleMouseDown}
            className={`group absolute top-0 z-10 h-screen w-4 cursor-col-resize ${side === "start" ? "-start-1.5" : "-end-1.5"}`}
        >
            <div className="bg-border group-hover:bg-menu-active-fg absolute top-0 left-1/2 h-full w-[2px] -translate-x-1/2 transition-colors duration-150" />
        </div>
    )
}
