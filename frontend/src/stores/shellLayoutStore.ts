import { create } from "zustand"

import type { ShellTab } from "@/types/ShellTab"

const MIN_TAB_WIDTH = 200
const MIN_EDITOR_TAB_WIDTH = 560
export const MIN_SOURCES_TAB_WIDTH = 340
const COMPACT_LAYOUT_VIEWPORT_WIDTH = 760
const COMPACT_MIN_TAB_WIDTH = 160
const COMPACT_MIN_EDITOR_TAB_WIDTH = 380
const COMPACT_MIN_SOURCES_TAB_WIDTH = 220
const TRANSITION_MS = 380
const DEFAULT_TAB_WIDTH_RATIOS: Record<string, number> = {
    tree: 28,
    editor: 44,
    sources: 28,
}

let transitionTimer: ReturnType<typeof setTimeout> | null = null

const getViewportWidth = () => (typeof window !== "undefined" ? window.innerWidth : 1920)

function getMinTabWidth(id: string, viewportWidth: number = getViewportWidth()): number {
    if (viewportWidth <= COMPACT_LAYOUT_VIEWPORT_WIDTH) {
        if (id === "editor") {
            return COMPACT_MIN_EDITOR_TAB_WIDTH
        }
        if (id === "sources") {
            return COMPACT_MIN_SOURCES_TAB_WIDTH
        }
        return COMPACT_MIN_TAB_WIDTH
    }
    if (id === "editor") {
        return MIN_EDITOR_TAB_WIDTH
    }
    if (id === "sources") {
        return MIN_SOURCES_TAB_WIDTH
    }
    return MIN_TAB_WIDTH
}

function allocateWidthsByWeight(
    tabs: ShellTab[],
    targetTotal: number,
    viewportWidth: number,
    getWeight: (tab: ShellTab) => number,
): Map<string, number> {
    const nextWidths = new Map<string, number>()
    if (tabs.length === 0) {
        return nextWidths
    }

    let remainingTabs = tabs
    let remainingWidth = targetTotal

    while (remainingTabs.length > 0) {
        const totalWeight = remainingTabs.reduce((sum, tab) => sum + Math.max(0, getWeight(tab)), 0)
        let clampedAny = false
        const nextRemainingTabs: ShellTab[] = []

        for (const tab of remainingTabs) {
            const minWidth = getMinTabWidth(tab.id, viewportWidth)
            const normalizedWeight =
                totalWeight > 0
                    ? Math.max(0, getWeight(tab)) / totalWeight
                    : 1 / remainingTabs.length
            const proposedWidth = remainingWidth * normalizedWeight
            if (proposedWidth < minWidth) {
                nextWidths.set(tab.id, minWidth)
                remainingWidth -= minWidth
                clampedAny = true
                continue
            }
            nextRemainingTabs.push(tab)
        }

        if (!clampedAny) {
            const finalWeight = nextRemainingTabs.reduce((sum, tab) => sum + Math.max(0, getWeight(tab)), 0)
            for (const tab of nextRemainingTabs) {
                const normalizedWeight =
                    finalWeight > 0
                        ? Math.max(0, getWeight(tab)) / finalWeight
                        : 1 / nextRemainingTabs.length
                nextWidths.set(tab.id, remainingWidth * normalizedWeight)
            }
            return nextWidths
        }

        remainingTabs = nextRemainingTabs
    }

    return nextWidths
}

function distributeWidths(tabs: ShellTab[], viewportWidth: number): ShellTab[] {
    const visible = tabs.filter((t) => t.isVisible)
    if (visible.length === 0) return tabs

    const persisted = visible
        .filter((t) => t.persistWidth)
        .map((tab) => ({
            ...tab,
            width: Math.max(getMinTabWidth(tab.id, viewportWidth), tab.width),
        }))
    const distributable = visible.filter((t) => !t.persistWidth)
    if (distributable.length === 0) return tabs

    const persistedWidth = persisted.reduce((sum, t) => sum + t.width, 0)
    const distributableViewportWidth = Math.max(0, viewportWidth - persistedWidth)
    const distributableIds = new Set(distributable.map((t) => t.id))
    const totalRatio = distributable.reduce((sum, tab) => sum + (DEFAULT_TAB_WIDTH_RATIOS[tab.id] ?? 0), 0)
    const nextWidths = allocateWidthsByWeight(distributable, distributableViewportWidth, viewportWidth, (tab) =>
        totalRatio > 0 ? DEFAULT_TAB_WIDTH_RATIOS[tab.id] ?? 0 : 1,
    )

    return tabs.map((tab) => {
        const persistedTab = persisted.find((persistedItem) => persistedItem.id === tab.id)
        if (persistedTab) {
            return persistedTab
        }
        if (!distributableIds.has(tab.id)) {
            return tab
        }

        const width = nextWidths.get(tab.id) ?? tab.width
        return { ...tab, width }
    })
}

interface ShellLayoutState {
    tabs: ShellTab[]
    isTransitioning: boolean
    hasUserResizedTabs: boolean
    setTabs: (tabs: ShellTab[]) => void
    resetVisibleTabWidthsToDefault: () => void
    toggleTab: (id: string) => void
    resizeTabWithNeighbor: (id: string, newWidth: number) => void
    redistributeWidths: (viewportWidth: number) => void
}

export const useShellLayoutStore = create<ShellLayoutState>((set) => ({
    tabs: [],
    isTransitioning: false,
    hasUserResizedTabs: false,

    setTabs: (tabs) => {
        if (transitionTimer) {
            clearTimeout(transitionTimer)
            transitionTimer = null
        }
        set({
            tabs: distributeWidths(tabs, getViewportWidth()),
            isTransitioning: false,
            hasUserResizedTabs: false,
        })
    },

    resetVisibleTabWidthsToDefault: () =>
        set((state) => ({
            tabs: distributeWidths(state.tabs, getViewportWidth()),
            hasUserResizedTabs: false,
        })),

    toggleTab: (id) => {
        if (transitionTimer) clearTimeout(transitionTimer)

        set((state) => {
            const tab = state.tabs.find((t) => t.id === id)
            if (!tab) return state

            const toggled = state.tabs.map((t) => (t.id === id ? { ...t, isVisible: !t.isVisible } : t))

            return {
                isTransitioning: true,
                tabs: distributeWidths(toggled, getViewportWidth()),
                hasUserResizedTabs: false,
            }
        })

        transitionTimer = setTimeout(() => {
            set({ isTransitioning: false })
            transitionTimer = null
        }, TRANSITION_MS)
    },

    redistributeWidths: (viewportWidth) =>
        set((state) => {
            const visible = state.tabs.filter((t) => t.isVisible)
            if (visible.length === 0) return state
            if (!state.hasUserResizedTabs) {
                return {
                    tabs: distributeWidths(state.tabs, viewportWidth),
                }
            }

            const nextWidths = allocateWidthsByWeight(visible, viewportWidth, viewportWidth, (tab) =>
                Math.max(1, tab.width),
            )
            return {
                tabs: state.tabs.map((t) =>
                    t.isVisible ? { ...t, width: nextWidths.get(t.id) ?? t.width } : t,
                ),
            }
        }),

    resizeTabWithNeighbor: (id, newWidth) =>
        set((state) => {
            const visible = state.tabs.filter((t) => t.isVisible)
            const idx = visible.findIndex((t) => t.id === id)
            if (idx === -1 || idx === visible.length - 1) return state

            const current = visible[idx]
            const neighbor = visible[idx + 1]
            const delta = newWidth - current.width

            let cw = current.width + delta
            let nw = neighbor.width - delta
            const viewportWidth = getViewportWidth()
            const currentMinWidth = getMinTabWidth(current.id, viewportWidth)
            const neighborMinWidth = getMinTabWidth(neighbor.id, viewportWidth)

            if (cw < currentMinWidth) {
                cw = currentMinWidth
                nw = neighbor.width + (current.width - currentMinWidth)
            } else if (nw < neighborMinWidth) {
                nw = neighborMinWidth
                cw = current.width + (neighbor.width - neighborMinWidth)
            }

            return {
                tabs: state.tabs.map((t) => {
                    if (t.id === current.id) return { ...t, width: cw }
                    if (t.id === neighbor.id) return { ...t, width: nw }
                    return t
                }),
                hasUserResizedTabs: true,
            }
        }),
}))
