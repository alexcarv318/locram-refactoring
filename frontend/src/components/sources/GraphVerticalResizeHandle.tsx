import { useRef, useState } from "react"
import type { MouseEvent } from "react"

interface GraphVerticalResizeHandleProps {
    containerId: string
    heightPercent: number
    onResize: (newHeightPercent: number) => void
    disabled?: boolean
    minHeight?: number
    maxHeight?: number
    snapPoints?: number[]
    snapThreshold?: number
}

export function GraphVerticalResizeHandle({
    containerId,
    heightPercent,
    onResize,
    disabled = false,
    minHeight = 20,
    maxHeight = 60,
    snapPoints = [],
    snapThreshold = 0,
}: GraphVerticalResizeHandleProps) {
    const [isResizing, setIsResizing] = useState(false)

    const animationFrameRef = useRef<number | null>(null)
    const startYRef = useRef(0)
    const startHeightPercentRef = useRef(0)

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (disabled) return

        e.preventDefault()
        e.stopPropagation()

        const container = document.querySelector(`[data-sources-container-id="${containerId}"]`) as HTMLElement
        if (!container) return

        setIsResizing(true)
        startYRef.current = e.clientY
        startHeightPercentRef.current = heightPercent

        document.body.style.cursor = "row-resize"
        document.body.style.userSelect = "none"

        const containerHeight = container.getBoundingClientRect().height

        const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
            if (!containerHeight) return

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }

            animationFrameRef.current = requestAnimationFrame(() => {
                const deltaY = moveEvent.clientY - startYRef.current
                const deltaPercent = (deltaY / containerHeight) * 100
                const constrainedHeight = Math.max(
                    minHeight,
                    Math.min(maxHeight, startHeightPercentRef.current + deltaPercent),
                )
                const closestSnapPoint = snapPoints.reduce<number | null>((closest, snapPoint) => {
                    if (Math.abs(snapPoint - constrainedHeight) > snapThreshold) {
                        return closest
                    }
                    if (closest === null) {
                        return snapPoint
                    }
                    return Math.abs(snapPoint - constrainedHeight) < Math.abs(closest - constrainedHeight)
                        ? snapPoint
                        : closest
                }, null)
                onResize(closestSnapPoint ?? constrainedHeight)
            })
        }

        const handleMouseUp = () => {
            setIsResizing(false)

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
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
            onMouseDown={handleMouseDown}
            className="bg-background group relative z-10 h-3 w-full cursor-row-resize select-none"
        >
            <div
                className={`bg-border group-hover:bg-menu-active-fg absolute top-1/2 left-0 w-full -translate-y-1/2 transition-colors duration-150 ${
                    isResizing ? "bg-menu-active-fg h-1" : "h-[2px]"
                }`}
            />
        </div>
    )
}
