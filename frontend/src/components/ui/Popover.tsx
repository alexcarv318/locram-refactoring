import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils/cn"

interface PopoverContextValue {
    open: boolean
    setOpen: (open: boolean) => void
    triggerRef: React.RefObject<HTMLElement | null>
    align: "left" | "center" | "right"
    side: "top" | "bottom"
}

const PopoverContext = createContext<PopoverContextValue | undefined>(undefined)

function usePopoverContext() {
    const context = useContext(PopoverContext)
    if (!context) {
        throw new Error("Popover components must be used within Popover")
    }
    return context
}

interface PopoverProps {
    children: ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    align?: "left" | "center" | "right"
    side?: "top" | "bottom"
}

function Popover({ children, open: controlledOpen, onOpenChange, align = "left", side = "bottom" }: PopoverProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const triggerRef = useRef<HTMLElement>(null)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const handleOpenChange = useCallback(
        (newOpen: boolean) => {
            if (isControlled) {
                onOpenChange?.(newOpen)
            } else {
                setInternalOpen(newOpen)
            }
        },
        [isControlled, onOpenChange],
    )

    return (
        <PopoverContext.Provider value={{ open, setOpen: handleOpenChange, triggerRef, align, side }}>
            {children}
        </PopoverContext.Provider>
    )
}

interface PopoverTriggerProps {
    children: ReactNode
    asChild?: boolean
    className?: string
}

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
    return (value: T | null) => {
        refs.forEach((ref) => {
            if (!ref) return
            if (typeof ref === "function") {
                ref(value)
            } else {
                try {
                    ;(ref as React.MutableRefObject<T | null>).current = value
                } catch {
                    // readonly ref
                }
            }
        })
    }
}

function PopoverTrigger({ children, asChild, className }: PopoverTriggerProps) {
    const { open, setOpen, triggerRef } = usePopoverContext()

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (e.currentTarget instanceof HTMLElement) {
            ;(triggerRef as React.MutableRefObject<HTMLElement | null>).current = e.currentTarget
        }
        setOpen(!open)
    }

    if (asChild && React.isValidElement(children)) {
        const childProps = children.props as {
            className?: string
            onClick?: (e: React.MouseEvent) => void
            ref?: React.Ref<HTMLElement>
        }
        /* eslint-disable react-hooks/refs */
        return React.cloneElement(children, {
            ref: mergeRefs(childProps.ref, triggerRef as any),
            onClick: (e: React.MouseEvent) => {
                handleClick(e)
                childProps.onClick?.(e)
            },
            className: cn(className, childProps.className),
        } as any)
        /* eslint-enable react-hooks/refs */
    }

    return (
        <div
            ref={triggerRef as unknown as React.RefObject<HTMLDivElement>}
            onClick={handleClick}
            className={cn("relative", className)}
        >
            {children}
        </div>
    )
}

interface PopoverContentProps {
    children: ReactNode
    className?: string
    align?: "left" | "center" | "right"
    side?: "top" | "bottom"
    sideOffset?: number
}

function PopoverContent({
    children,
    className,
    align: contentAlign,
    side: contentSide,
    sideOffset,
}: PopoverContentProps) {
    const { open, setOpen, triggerRef, align: contextAlign, side: contextSide } = usePopoverContext()
    const popoverRef = useRef<HTMLDivElement>(null)

    const align = contentAlign ?? contextAlign ?? "left"
    const side = contentSide ?? contextSide ?? "bottom"

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                triggerRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                setOpen(false)
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside)
            return () => {
                document.removeEventListener("mousedown", handleClickOutside)
            }
        }
    }, [open, setOpen, triggerRef])

    useEffect(() => {
        if (!open) return
        if (!triggerRef.current) return

        const updatePosition = () => {
            if (!popoverRef.current || !triggerRef.current) return

            const triggerRect = triggerRef.current.getBoundingClientRect()
            const popover = popoverRef.current

            popover.style.setProperty("--popover-trigger-width", `${triggerRect.width}px`)

            const viewportWidth = window.innerWidth
            const viewportHeight = window.innerHeight
            const padding = 8
            const gap = sideOffset ?? 8

            const getLeft = () => {
                switch (align) {
                    case "left":
                        return triggerRect.left
                    case "right":
                        return triggerRect.right - popover.offsetWidth
                    case "center":
                        return triggerRect.left + triggerRect.width / 2 - popover.offsetWidth / 2
                    default:
                        return triggerRect.left
                }
            }

            const placeBottomTop = triggerRect.bottom + gap
            const placeTopTop = triggerRect.top - popover.offsetHeight - gap

            const wouldOverflowBottom = placeBottomTop + popover.offsetHeight > viewportHeight - padding
            const wouldOverflowTop = placeTopTop < padding

            let effectiveSide: "top" | "bottom" = side
            if (side === "bottom" && wouldOverflowBottom && !wouldOverflowTop) {
                effectiveSide = "top"
            } else if (side === "top" && wouldOverflowTop && !wouldOverflowBottom) {
                effectiveSide = "bottom"
            }

            let top = effectiveSide === "bottom" ? placeBottomTop : placeTopTop
            let left = getLeft()

            const maxLeft = viewportWidth - popover.offsetWidth - padding
            const maxTop = viewportHeight - popover.offsetHeight - padding

            left = Math.min(Math.max(left, padding), Math.max(maxLeft, padding))
            top = Math.min(Math.max(top, padding), Math.max(maxTop, padding))

            popover.style.top = `${top}px`
            popover.style.left = `${left}px`
        }

        const raf = requestAnimationFrame(updatePosition)

        window.addEventListener("resize", updatePosition)
        window.addEventListener("scroll", updatePosition, true)

        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener("resize", updatePosition)
            window.removeEventListener("scroll", updatePosition, true)
        }
    }, [open, align, side, sideOffset, triggerRef])

    if (!open) return null

    return createPortal(
        <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
                "border-border bg-popover text-popover-foreground fixed z-[9999] min-w-[200px] rounded-md border p-2 shadow-md",
                className,
            )}
            style={{ top: 0, left: 0 }}
        >
            {children}
        </div>,
        document.body,
    )
}

export { Popover, PopoverTrigger, PopoverContent }
