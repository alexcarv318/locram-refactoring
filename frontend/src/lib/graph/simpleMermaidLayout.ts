import type { SimpleMermaidGraph } from "@/lib/graph/simpleMermaidModel"

export interface SimpleMermaidLayoutNode {
    id: string
    labelLines: string[]
    x: number
    y: number
    width: number
    height: number
}

export interface SimpleMermaidSubgraphBounds {
    id: string
    label: string
    x: number
    y: number
    width: number
    height: number
}

interface TreeNode {
    id: string
    children: TreeNode[]
    subtreeWidth: number
    subtreeHeight: number
    x: number
    y: number
}

const H_GAP = 150
const V_GAP = 180
const CHILD_ROW_GAP = 120
const ROOT_ROW_GAP = 160
const SUBGRAPH_PADDING = 40
const SUBGRAPH_LABEL_HEIGHT = 28
const BLOCK_GAP = 80
const MAX_ITEMS_PER_ROW = 5
const NODE_MIN_WIDTH = 180
const NODE_MAX_WIDTH = 320
const NODE_HORIZONTAL_PADDING = 52
const NODE_MIN_HEIGHT = 60
const NODE_VERTICAL_PADDING = 30
const NODE_LINE_HEIGHT = 17
const APPROX_CHAR_WIDTH = 8.5

export function computeSimpleMermaidLayout(graph: SimpleMermaidGraph): {
    nodes: Map<string, SimpleMermaidLayoutNode>
    subgraphBounds: SimpleMermaidSubgraphBounds[]
} {
    const layoutNodes = new Map<string, SimpleMermaidLayoutNode>()
    if (graph.nodes.length === 0) {
        return { nodes: layoutNodes, subgraphBounds: [] }
    }

    const dimensions = new Map<string, { width: number; height: number; labelLines: string[] }>()
    for (const node of graph.nodes) {
        dimensions.set(node.id, measureNodeLabel(node.label))
    }

    const childrenByNodeId = new Map<string, string[]>()
    for (const edge of graph.edges) {
        const children = childrenByNodeId.get(edge.source) ?? []
        children.push(edge.target)
        childrenByNodeId.set(edge.source, children)
    }

    const nodesBySubgraphId = new Map<string, string[]>()
    const nodesWithoutSubgraph: string[] = []
    for (const node of graph.nodes) {
        if (!node.subgraphId) {
            nodesWithoutSubgraph.push(node.id)
            continue
        }
        const subgraphNodeIds = nodesBySubgraphId.get(node.subgraphId) ?? []
        subgraphNodeIds.push(node.id)
        nodesBySubgraphId.set(node.subgraphId, subgraphNodeIds)
    }

    function buildTree(nodeId: string, visitedNodeIds: Set<string>, allowedNodeIds?: Set<string>): TreeNode {
        visitedNodeIds.add(nodeId)
        const childTrees: TreeNode[] = []
        const childNodeIds = childrenByNodeId.get(nodeId) ?? []
        for (const childNodeId of childNodeIds) {
            if (visitedNodeIds.has(childNodeId)) {
                continue
            }
            if (allowedNodeIds && !allowedNodeIds.has(childNodeId)) {
                continue
            }
            childTrees.push(buildTree(childNodeId, visitedNodeIds, allowedNodeIds))
        }

        const nodeDimensions = dimensions.get(nodeId) ?? measureNodeLabel(nodeId)
        const childRows = chunkIntoRows(childTrees)
        const subtreeWidth =
            childRows.length === 0
                ? nodeDimensions.width
                : Math.max(
                      nodeDimensions.width,
                      ...childRows.map((row) => {
                          return row.reduce((sum, child) => sum + child.subtreeWidth, 0) + H_GAP * Math.max(0, row.length - 1)
                      }),
                  )
        const subtreeHeight =
            childRows.length === 0
                ? nodeDimensions.height
                : nodeDimensions.height +
                  V_GAP +
                  childRows.reduce((sum, row) => {
                      return sum + Math.max(...row.map((child) => child.subtreeHeight))
                  }, 0) +
                  CHILD_ROW_GAP * Math.max(0, childRows.length - 1)

        return {
            id: nodeId,
            children: childTrees,
            subtreeWidth,
            subtreeHeight,
            x: 0,
            y: 0,
        }
    }

    function positionTree(tree: TreeNode, centerX: number, topY: number): void {
        tree.x = centerX
        tree.y = topY
        if (tree.children.length === 0) {
            return
        }

        const nodeHeight = dimensions.get(tree.id)?.height ?? NODE_MIN_HEIGHT
        const childRows = chunkIntoRows(tree.children)
        let currentRowTopY = topY + nodeHeight + V_GAP

        for (const row of childRows) {
            const childRowWidth = row.reduce((sum, child) => sum + child.subtreeWidth, 0) + H_GAP * Math.max(0, row.length - 1)
            let childLeftX = centerX - childRowWidth / 2

            for (const child of row) {
                const childCenterX = childLeftX + child.subtreeWidth / 2
                positionTree(child, childCenterX, currentRowTopY)
                childLeftX += child.subtreeWidth + H_GAP
            }

            currentRowTopY += Math.max(...row.map((child) => child.subtreeHeight)) + CHILD_ROW_GAP
        }
    }

    function flattenTree(tree: TreeNode): void {
        const nodeDimensions = dimensions.get(tree.id) ?? measureNodeLabel(tree.id)
        layoutNodes.set(tree.id, {
            id: tree.id,
            labelLines: nodeDimensions.labelLines,
            x: tree.x,
            y: tree.y,
            width: nodeDimensions.width,
            height: nodeDimensions.height,
        })
        for (const child of tree.children) {
            flattenTree(child)
        }
    }

    function measureTrees(trees: TreeNode[]): { minX: number; maxX: number; minY: number; maxY: number } {
        let minX = Number.POSITIVE_INFINITY
        let maxX = Number.NEGATIVE_INFINITY
        let minY = Number.POSITIVE_INFINITY
        let maxY = Number.NEGATIVE_INFINITY

        function measureTree(tree: TreeNode): void {
            const nodeDimensions = dimensions.get(tree.id) ?? measureNodeLabel(tree.id)
            minX = Math.min(minX, tree.x - nodeDimensions.width / 2)
            maxX = Math.max(maxX, tree.x + nodeDimensions.width / 2)
            minY = Math.min(minY, tree.y - nodeDimensions.height / 2)
            maxY = Math.max(maxY, tree.y + nodeDimensions.height / 2)
            for (const child of tree.children) {
                measureTree(child)
            }
        }

        for (const tree of trees) {
            measureTree(tree)
        }

        return { minX, maxX, minY, maxY }
    }

    function buildTreesForNodeIds(nodeIds: string[]): TreeNode[] {
        if (nodeIds.length === 0) {
            return []
        }

        const allowedNodeIds = new Set(nodeIds)
        const visitedNodeIds = new Set<string>()
        const rootNodeIds = nodeIds.filter((nodeId) => {
            return !graph.edges.some((edge) => edge.target === nodeId && allowedNodeIds.has(edge.source))
        })

        if (rootNodeIds.length === 0) {
            rootNodeIds.push(nodeIds[0])
        }

        const trees: TreeNode[] = []
        for (const rootNodeId of rootNodeIds) {
            if (!visitedNodeIds.has(rootNodeId)) {
                trees.push(buildTree(rootNodeId, visitedNodeIds, allowedNodeIds))
            }
        }

        for (const nodeId of nodeIds) {
            if (!visitedNodeIds.has(nodeId)) {
                trees.push(buildTree(nodeId, visitedNodeIds, allowedNodeIds))
            }
        }

        const treeRows = chunkIntoRows(trees)
        let currentRowTopY = 0
        for (const row of treeRows) {
            const totalWidth = row.reduce((sum, tree) => sum + tree.subtreeWidth, 0) + H_GAP * Math.max(0, row.length - 1)
            let startX = -totalWidth / 2
            for (const tree of row) {
                positionTree(tree, startX + tree.subtreeWidth / 2, currentRowTopY)
                startX += tree.subtreeWidth + H_GAP
            }
            currentRowTopY += Math.max(...row.map((tree) => tree.subtreeHeight)) + ROOT_ROW_GAP
        }

        return trees
    }

    interface LayoutBlock {
        subgraphId: string | null
        label: string
        trees: TreeNode[]
    }

    const blocks: LayoutBlock[] = []
    const assignedNodeIds = new Set<string>()

    for (const subgraph of graph.subgraphs) {
        const subgraphNodeIds = nodesBySubgraphId.get(subgraph.id) ?? []
        const trees = buildTreesForNodeIds(subgraphNodeIds)
        for (const nodeId of subgraphNodeIds) {
            assignedNodeIds.add(nodeId)
        }
        blocks.push({
            subgraphId: subgraph.id,
            label: subgraph.label,
            trees,
        })
    }

    const remainingNodeIds = nodesWithoutSubgraph.filter((nodeId) => !assignedNodeIds.has(nodeId))
    if (remainingNodeIds.length > 0) {
        blocks.push({
            subgraphId: null,
            label: "",
            trees: buildTreesForNodeIds(remainingNodeIds),
        })
    }

    const subgraphBounds: SimpleMermaidSubgraphBounds[] = []
    let currentY = 0

    for (const block of blocks) {
        if (block.trees.length === 0) {
            continue
        }

        const initialBounds = measureTrees(block.trees)
        const offsetY = currentY - initialBounds.minY + (block.subgraphId ? SUBGRAPH_LABEL_HEIGHT : 0)

        function offsetTree(tree: TreeNode): void {
            tree.y += offsetY
            for (const child of tree.children) {
                offsetTree(child)
            }
        }

        for (const tree of block.trees) {
            offsetTree(tree)
        }

        const offsetBounds = measureTrees(block.trees)
        if (block.subgraphId) {
            subgraphBounds.push({
                id: block.subgraphId,
                label: block.label,
                x: offsetBounds.minX - SUBGRAPH_PADDING,
                y: offsetBounds.minY - SUBGRAPH_PADDING - SUBGRAPH_LABEL_HEIGHT,
                width: offsetBounds.maxX - offsetBounds.minX + SUBGRAPH_PADDING * 2,
                height: offsetBounds.maxY - offsetBounds.minY + SUBGRAPH_PADDING * 2 + SUBGRAPH_LABEL_HEIGHT,
            })
        }

        currentY = offsetBounds.maxY + BLOCK_GAP
        for (const tree of block.trees) {
            flattenTree(tree)
        }
    }

    return {
        nodes: layoutNodes,
        subgraphBounds,
    }
}

function chunkIntoRows<T>(items: T[]): T[][] {
    const rows: T[][] = []
    for (let index = 0; index < items.length; index += MAX_ITEMS_PER_ROW) {
        rows.push(items.slice(index, index + MAX_ITEMS_PER_ROW))
    }
    return rows
}

function measureNodeLabel(label: string): { width: number; height: number; labelLines: string[] } {
    const maxCharsPerLine = Math.max(12, Math.floor((NODE_MAX_WIDTH - NODE_HORIZONTAL_PADDING) / APPROX_CHAR_WIDTH))
    const labelLines = wrapLabel(label, maxCharsPerLine)
    const longestLineLength = Math.max(...labelLines.map((line) => line.length), 0)
    return {
        width: Math.max(NODE_MIN_WIDTH, Math.min(NODE_MAX_WIDTH, longestLineLength * APPROX_CHAR_WIDTH + NODE_HORIZONTAL_PADDING)),
        height: Math.max(NODE_MIN_HEIGHT, labelLines.length * NODE_LINE_HEIGHT + NODE_VERTICAL_PADDING),
        labelLines,
    }
}

function wrapLabel(label: string, maxCharsPerLine: number): string[] {
    const normalized = label.replace(/\s+/g, " ").trim()
    if (!normalized) {
        return ["Untitled"]
    }

    const words = normalized.split(" ")
    const lines: string[] = []
    let currentLine = ""

    for (const word of words) {
        const wordParts = splitLongWord(word, maxCharsPerLine)
        for (const wordPart of wordParts) {
            const nextLine = currentLine ? `${currentLine} ${wordPart}` : wordPart
            if (nextLine.length <= maxCharsPerLine) {
                currentLine = nextLine
                continue
            }
            if (currentLine) {
                lines.push(currentLine)
            }
            currentLine = wordPart
        }
    }

    if (currentLine) {
        lines.push(currentLine)
    }

    return lines
}

function splitLongWord(word: string, maxCharsPerLine: number): string[] {
    if (word.length <= maxCharsPerLine) {
        return [word]
    }

    const parts: string[] = []
    for (let index = 0; index < word.length; index += maxCharsPerLine) {
        parts.push(word.slice(index, index + maxCharsPerLine))
    }
    return parts
}
