import {
    LINK_COLOR_DARK,
    LINK_COLOR_LIGHT,
    LINK_SELECTED_COLOR_DARK,
    LINK_SELECTED_COLOR_LIGHT,
    NODE_FALLBACK_COLOR,
    NODE_PALETTE,
} from "@/lib/graph/color-palette"
import { getPrimaryLabel } from "@/lib/graph/labels"
import { isContextScopeNode } from "@/lib/graph/scopeOrigin"
import { getNodeRadiusForGraphNode } from "@/lib/graph/node-size"
import type { Graph3DLink, Graph3DNode } from "@/lib/graph3d/types"

type ThemeMode = "light" | "dark"

const hexToRgba = (hex: string, alpha: number): string => {
    const normalizedHex = hex.replace("#", "")
    const value = parseInt(normalizedHex, 16)
    const red = (value >> 16) & 255
    const green = (value >> 8) & 255
    const blue = value & 255
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

const truncateText = (text: string, maxLength: number = 50): string => {
    return text && text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text
}

export function getNodeColor(node: Graph3DNode): string {
    const labels = Array.isArray(node.labels) ? node.labels : []
    let color = NODE_FALLBACK_COLOR

    if (node.color && labels.length === 0) {
        color = String(node.color)
    }

    if (labels.length > 0 && color === NODE_FALLBACK_COLOR) {
        const primary = getPrimaryLabel(labels)
        const hex = NODE_PALETTE[primary]
        if (hex) {
            color = hex
        }
    }

    return isContextScopeNode(node) ? hexToRgba(color, 0.72) : color
}

export function getNodeSize(node: Graph3DNode): number {
    const baseSize = getNodeRadiusForGraphNode(node)
    return isContextScopeNode(node) ? baseSize * 0.82 : baseSize
}

export const getNodeLabel = (node: Graph3DNode) => {
    const title = node.title || node.heading || node.name || "Untitled"
    const paragraphNumber = `§ ${node.number}`
    const nodeLabel = getPrimaryLabel(node.labels || []) == "Paragraph" ? paragraphNumber : title
    return truncateText(String(nodeLabel))
}

export function getLinkLabel(link: Graph3DLink | null | undefined): string {
    if (!link) return ""
    if (link.parentChild) return "PARENT_CHILD"
    if (link.type) return String(link.type)
    return ""
}

export function getLinkStableId(link: Graph3DLink | null | undefined): string | null {
    if (!link) return null
    if (link.id) return String(link.id)

    const srcId = typeof link.source === "object" ? link.source.id : link.source
    const tgtId = typeof link.target === "object" ? link.target.id : link.target
    if (!srcId || !tgtId) return null

    const type = link.type ? String(link.type) : ""
    return `${String(srcId)}->${String(tgtId)}:${type}`
}

export function getLinkColor(
    link: Graph3DLink,
    options: {
        theme?: ThemeMode
        selectedNodes?: Set<Graph3DNode>
        selectedLinks?: Set<Graph3DLink>
        highlightedLinkId?: string | null
    } = {},
): string {
    const { theme = "light", selectedNodes, selectedLinks, highlightedLinkId } = options

    const baseColor = theme === "dark" ? LINK_COLOR_DARK : LINK_COLOR_LIGHT
    const selectedColor = theme === "dark" ? LINK_SELECTED_COLOR_DARK : LINK_SELECTED_COLOR_LIGHT

    const linkId = getLinkStableId(link)

    if (selectedLinks?.has(link)) return selectedColor
    if (linkId && highlightedLinkId === linkId) return selectedColor

    if (selectedNodes && selectedNodes.size > 0) {
        const srcId = typeof link.source === "object" ? link.source.id : link.source
        const tgtId = typeof link.target === "object" ? link.target.id : link.target
        const selectedIds = new Set(Array.from(selectedNodes).map((n) => n.id))

        if (selectedIds.has(srcId) && selectedIds.has(tgtId)) return selectedColor
        if (selectedIds.has(srcId) || selectedIds.has(tgtId)) return selectedColor
    }

    return baseColor
}

export function getLinkWidth(
    link: Graph3DLink,
    options: {
        selectedLinks?: Set<Graph3DLink>
        highlightedLinkId?: string | null
    } = {},
): number {
    const { selectedLinks, highlightedLinkId } = options

    const linkId = getLinkStableId(link)

    if (selectedLinks?.has(link)) return 6.0
    if (linkId && highlightedLinkId === linkId) return 3
    if (link.parentChild) return 3

    return 3
}
