import { useCallback, useEffect, useRef, useState, type CSSProperties, type FocusEvent } from "react"

import { cn } from "@/lib/utils/cn"

const HOVER_DELAY_MS = 1000

export function useMarqueeLabel(label: string) {
    const textRef = useRef<HTMLSpanElement>(null)
    const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [marqueeActive, setMarqueeActive] = useState(false)
    const [marqueeShift, setMarqueeShift] = useState("0px")
    const [marqueeDuration, setMarqueeDuration] = useState("6s")
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    const clearDelay = useCallback(() => {
        if (delayTimerRef.current !== null) {
            clearTimeout(delayTimerRef.current)
            delayTimerRef.current = null
        }
    }, [])

    const activateMarquee = useCallback(() => {
        clearDelay()
        delayTimerRef.current = setTimeout(() => {
            const el = textRef.current
            if (!el) {
                return
            }
            if (el.scrollWidth <= el.clientWidth) {
                return
            }
            const shift = el.scrollWidth - el.clientWidth
            setMarqueeShift(`-${shift}px`)
            const seconds = Math.min(14, Math.max(2, shift / 60))
            setMarqueeDuration(`${seconds}s`)
            setMarqueeActive(true)
        }, HOVER_DELAY_MS)
    }, [clearDelay])

    const handleRowEnter = useCallback(() => {
        activateMarquee()
    }, [activateMarquee])

    const handleRowLeave = useCallback(() => {
        clearDelay()
        setMarqueeActive(false)
    }, [clearDelay])

    const handleRowFocus = useCallback(
        (event: FocusEvent<HTMLElement>) => {
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
                return
            }
            activateMarquee()
        },
        [activateMarquee],
    )

    const handleRowBlur = useCallback(
        (event: FocusEvent<HTMLElement>) => {
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
                return
            }
            clearDelay()
            setMarqueeActive(false)
        },
        [clearDelay],
    )

    useEffect(() => {
        return () => clearDelay()
    }, [clearDelay])

    useEffect(() => {
        setMarqueeActive(false)
    }, [label])

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return
        }

        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
        const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)

        updatePreference()
        mediaQuery.addEventListener("change", updatePreference)

        return () => mediaQuery.removeEventListener("change", updatePreference)
    }, [])

    const labelStyle: CSSProperties | undefined = marqueeActive
        ? ({
              ["--marquee-shift"]: marqueeShift,
              ["--marquee-duration"]: marqueeDuration,
          } as CSSProperties)
        : undefined

    const labelClassName = cn(
        "block text-start",
        marqueeActive ? "whitespace-nowrap" : "truncate",
        marqueeActive && !prefersReducedMotion && "tree-label-marquee-animate",
    )

    return {
        rowMouseHandlers: {
            onMouseEnter: handleRowEnter,
            onMouseLeave: handleRowLeave,
            onFocus: handleRowFocus,
            onBlur: handleRowBlur,
        },
        labelRef: textRef,
        labelClassName,
        labelStyle,
    }
}
