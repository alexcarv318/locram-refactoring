import {
    LABEL_BG_LARGE_DARK,
    LABEL_BG_LARGE_LIGHT,
    LABEL_BG_SMALL_DARK,
    LABEL_BG_SMALL_LIGHT,
    LINK_COLOR_DARK,
    LINK_COLOR_LIGHT,
    LINK_SELECTED_COLOR_DARK,
    LINK_SELECTED_COLOR_LIGHT,
    NODE_FALLBACK_COLOR,
    NODE_PALETTE,
    NODE_PENDING_COLOR,
    SEARCH_MATCH_GLOW_COLOR,
    SELECTION_OVERLAY_COLOR,
    TEXT_COLOR_DARK,
    TEXT_COLOR_LIGHT,
} from "@/lib/graph/color-palette"
import { getPrimaryLabel } from "@/lib/graph/labels"
import { isTagGraphNode } from "@/lib/graph/tag-nodes"
import { isContextScopeNode } from "@/lib/graph/scopeOrigin"
import { getNodeRadiusForGraphNode } from "@/lib/graph/node-size"
import {
    applyCanvasLabelDirection,
    computeCanvasLabelBackgroundRect,
    computeCanvasLabelLayout,
    type CanvasLabelDirection,
} from "@/lib/graph2d/canvasLabel"
import { getLinkStableId } from "@/lib/graph2d/linkIds"
import type { Graph2DLink, Graph2DNode } from "@/lib/graph2d/types"

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const h = hex.replace("#", "")
    const n = parseInt(h, 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const truncateText = (text: string, maxLength: number = 50): string => {
    return text && text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text
}

export const getNodeColorHex = (node: Graph2DNode): string => {
    const labels = Array.isArray(node.labels) ? node.labels : []

    if (node.color && labels.length === 0) return String(node.color)
    if (labels.length > 0) {
        const primary = getPrimaryLabel(labels)
        const color = NODE_PALETTE[primary]
        if (color) return color
    }
    return NODE_FALLBACK_COLOR
}

export const getNodeColorRgb = (node: Graph2DNode): { r: number; g: number; b: number } => {
    return hexToRgb(getNodeColorHex(node))
}

export const getNodeSize = (node: Graph2DNode): number => {
    const baseSize = getNodeRadiusForGraphNode(node)
    return isContextScopeNode(node) ? baseSize * 0.82 : baseSize
}

export const getNodeLabel = (node: Graph2DNode) => {
    const title = node.title || node.heading || node.name || "Untitled"
    const paragraphNumber = `§ ${node.number}`
    const nodeLabel = getPrimaryLabel(node.labels || []) == "Paragraph" ? paragraphNumber : title
    return truncateText(String(nodeLabel))
}

export const getLinkLabel = (link: Graph2DLink | null | undefined): string => {
    if (!link) return ""
    if (link.parentChild) return "PARENT_CHILD"
    if (link.type) return String(link.type)
    return ""
}

interface LinkStyleOptions {
    theme?: "light" | "dark"
    selectedNodes?: Set<Graph2DNode>
    selectedLinks?: Set<Graph2DLink>
    highlightedLinkId?: string | null
}

export const getLinkColor = (link: Graph2DLink, options: LinkStyleOptions = {}): string => {
    const { theme = "light", selectedNodes, selectedLinks, highlightedLinkId } = options

    const baseColor = theme === "dark" ? LINK_COLOR_DARK : LINK_COLOR_LIGHT
    const selectedColor = theme === "dark" ? LINK_SELECTED_COLOR_DARK : LINK_SELECTED_COLOR_LIGHT

    const linkId = getLinkStableId(link)

    if (selectedLinks?.has(link)) return selectedColor
    if (linkId && highlightedLinkId === linkId) return selectedColor

    if (selectedNodes) {
        const srcId = typeof link.source === "object" ? link.source.id : link.source
        const tgtId = typeof link.target === "object" ? link.target.id : link.target
        const selectedIds = new Set(Array.from(selectedNodes).map((n) => n.id))

        if (selectedIds.has(srcId) && selectedIds.has(tgtId)) return selectedColor
        if (selectedIds.has(srcId) || selectedIds.has(tgtId)) return selectedColor
    }

    return baseColor
}

export const getLinkWidth = (link: Graph2DLink, options: LinkStyleOptions = {}): number => {
    const { selectedNodes, selectedLinks, highlightedLinkId } = options

    const linkId = getLinkStableId(link)

    if (selectedLinks?.has(link)) return 3.5

    if (selectedNodes) {
        const srcId = typeof link.source === "object" ? link.source.id : link.source
        const tgtId = typeof link.target === "object" ? link.target.id : link.target
        const selectedIds = new Set(Array.from(selectedNodes).map((n) => n.id))

        if (selectedIds.has(srcId) && selectedIds.has(tgtId)) return 3.0
        if (selectedIds.has(srcId) || selectedIds.has(tgtId)) return 2.0
    }

    if (linkId && highlightedLinkId === linkId) return 2.0

    if (link.parentChild) return 1.5

    return 0.5
}

interface NodeRenderOptions {
    theme?: "light" | "dark"
    selectedNodes?: Set<Graph2DNode>
    highlightedNodeId?: string | null
    searchMatchedNodeIds?: Set<string>
    showLabels?: boolean
    direction?: CanvasLabelDirection
}

export const renderNodeWithEffects = (
    node: Graph2DNode,
    ctx: CanvasRenderingContext2D,
    options: NodeRenderOptions = {},
): void => {
    const {
        theme = "light",
        selectedNodes = new Set(),
        highlightedNodeId = null,
        searchMatchedNodeIds,
        showLabels = true,
        direction = "ltr",
    } = options

    if (typeof node.x !== "number" || typeof node.y !== "number") return

    const nodeSize = getNodeSize(node)
    const rgb = node.__isPending ? hexToRgb(NODE_PENDING_COLOR) : getNodeColorRgb(node)
    const isSelected = selectedNodes.has(node)
    const isHighlighted = highlightedNodeId === node.id
    const isSearchMatch = searchMatchedNodeIds ? searchMatchedNodeIds.has(String(node.id)) : false

    if (isHighlighted || isSelected || isSearchMatch) {
        ctx.save()
        const glowRadius = nodeSize * (isSearchMatch ? 4.5 : 3.5)
        const gradient = ctx.createRadialGradient(node.x, node.y, nodeSize, node.x, node.y, glowRadius)

        const glowColor = isSearchMatch && !isSelected && !isHighlighted ? SEARCH_MATCH_GLOW_COLOR : rgb

        gradient.addColorStop(0, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, 0.6)`)
        gradient.addColorStop(0.3, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, 0.3)`)
        gradient.addColorStop(0.6, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, 0.1)`)
        gradient.addColorStop(1, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, 0)`)

        ctx.beginPath()
        ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI)
        ctx.fillStyle = gradient
        ctx.fill()
        ctx.restore()
    }

    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false)
    const opacity = node.opacity !== undefined ? node.opacity : 1.0
    const scopeOpacity = isContextScopeNode(node) ? opacity * 0.72 : opacity
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${scopeOpacity})`
    ctx.fill()

    if (isContextScopeNode(node)) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(node.x, node.y, nodeSize + 2, 0, 2 * Math.PI, false)
        ctx.strokeStyle = theme === "dark" ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.4)"
        ctx.lineWidth = 1
        ctx.setLineDash([3, 2])
        ctx.stroke()
        ctx.restore()
    }

    if (isHighlighted || isSelected) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false)
        ctx.fillStyle = SELECTION_OVERLAY_COLOR
        ctx.fill()
    }

    if (showLabels) {
        const label = getNodeLabel(node)
        if (label) {
            ctx.save()
            const fontSize = Math.max(8, Math.min(12, nodeSize * 0.6))
            ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
            applyCanvasLabelDirection(ctx, direction)
            const textColor = theme === "dark" ? TEXT_COLOR_DARK : TEXT_COLOR_LIGHT
            const placement = nodeSize < 20 ? "side" : "inside"
            const layout = computeCanvasLabelLayout({
                x: node.x,
                y: node.y,
                nodeSize,
                direction,
                placement,
            })
            ctx.textAlign = layout.textAlign
            ctx.textBaseline = layout.textBaseline

            const textMetrics = ctx.measureText(label)
            const textWidth = textMetrics.width
            const textHeight = fontSize

            const drawBackground =
                isTagGraphNode(node) ||
                placement === "side" ||
                (placement === "inside" && label.length > 10)
            if (drawBackground) {
                const rect = computeCanvasLabelBackgroundRect({
                    layout,
                    textWidth,
                    textHeight,
                })
                if (placement === "side") {
                    ctx.fillStyle = theme === "dark" ? LABEL_BG_SMALL_DARK : LABEL_BG_SMALL_LIGHT
                } else {
                    ctx.fillStyle = theme === "dark" ? LABEL_BG_LARGE_DARK : LABEL_BG_LARGE_LIGHT
                }
                ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
            }

            ctx.fillStyle = textColor
            ctx.fillText(label, layout.textX, layout.textY)
            ctx.restore()
        }
    }
}
