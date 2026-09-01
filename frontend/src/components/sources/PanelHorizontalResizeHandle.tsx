import { useRef } from "react"
import type { MouseEvent } from "react"

import { useDirection } from "@/providers/direction-provider"

interface PanelHorizontalResizeHandleProps {
    panelId: string
    width: number
    onResize: (newWidth: number) => void
    minWidth?: number
    maxWidth?: number
    disabled?: boolean
    side?: "start" | "end"
    position?: "start" | "end"
}

export function PanelHorizontalResizeHandle({
    panelId,
    width,
    onResize,
    minWidth = 200,
    maxWidth = 720,
    disabled = false,
    side = "end",
    position = side,
}: PanelHorizontalResizeHandleProps) {
    const { resolvedDirection } = useDirection()
    const isResizingRef = useRef(false)
    const animationFrameRef = useRef<number | null>(null)
    const startXRef = useRef(0)
    const startWidthRef = useRef(0)

    const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        if (disabled) {
            return
        }

        event.preventDefault()
        event.stopPropagation()

        const panelElement = document.querySelector(`[data-panel-id="${panelId}"]`) as HTMLElement | null
        if (!panelElement) {
            return
        }

        isResizingRef.current = true
        startXRef.current = event.clientX
        startWidthRef.current = width
        panelElement.style.transition = "none"
        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"

        const sideMultiplier = side === "start" ? -1 : 1
        const directionMultiplier = resolvedDirection === "rtl" ? -1 : 1
        const totalMultiplier = sideMultiplier * directionMultiplier

        const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
            if (!isResizingRef.current) {
                return
            }

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }

            animationFrameRef.current = requestAnimationFrame(() => {
                const deltaX = moveEvent.clientX - startXRef.current
                const nextWidth = startWidthRef.current + deltaX * totalMultiplier
                const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, nextWidth))
                onResize(constrainedWidth)
            })
        }

        const handleMouseUp = () => {
            isResizingRef.current = false

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }

            panelElement.style.transition = ""
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
        }

        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
    }

    if (disabled) {
        return null
    }

    return (
        <div
            onMouseDown={handleMouseDown}
            className={`group absolute top-0 z-10 h-screen w-4 cursor-col-resize ${position === "start" ? "-start-1.5" : "-end-1.5"}`}
        >
            <div className="bg-border group-hover:bg-menu-active-fg absolute top-0 start-1/2 h-full w-[2px] -translate-x-1/2 transition-colors duration-150" />
        </div>
    )
}
