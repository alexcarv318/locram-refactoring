import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils/cn"

interface TooltipProps {
    content: string
    children: ReactNode
}

export default function Tooltip({ content, children }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState({ top: 0, left: 0 })
    const triggerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isVisible || !triggerRef.current) return

        const updatePosition = () => {
            const gap = 6
            const triggerRect = triggerRef.current!.getBoundingClientRect()
            setPosition({ top: triggerRect.top - gap, left: triggerRect.left + triggerRect.width / 2 })
        }

        updatePosition()

        window.addEventListener("scroll", updatePosition, true)
        window.addEventListener("resize", updatePosition)

        return () => {
            window.removeEventListener("scroll", updatePosition, true)
            window.removeEventListener("resize", updatePosition)
        }
    }, [isVisible])

    if (!content) return <>{children}</>

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                className="inline-block"
            >
                {children}
            </div>

            {isVisible &&
                createPortal(
                    <div
                        style={{
                            top: `${position.top}px`,
                            left: `${position.left}px`,
                        }}
                        className={cn(
                            "fixed z-1000 -translate-x-1/2 -translate-y-full",
                            "pointer-events-none rounded-md whitespace-nowrap",
                            "border-border bg-popover border px-2 py-1",
                            "text-popover-foreground text-[11px] font-medium",
                            "shadow-md backdrop-blur-sm",
                        )}
                    >
                        {content}
                    </div>,
                    document.body,
                )}
        </>
    )
}
