import type { Graph3DLink, Graph3DNode } from "@/lib/graph3d/types"

export type Graph3DSelectionState = {
    selectedNodes: Set<Graph3DNode>
    selectedLinks: Set<Graph3DLink>
    highlightedNodeId: string | null
    highlightedLinkId: string | null
}

export function toggleNodeSelection({
    node,
    selectedNodes,
}: {
    node: Graph3DNode
    selectedNodes: Set<Graph3DNode>
}): Set<Graph3DNode> {
    const next = new Set(selectedNodes)
    if (next.has(node)) next.delete(node)
    else next.add(node)
    return next
}

export function toggleLinkSelection({
    link,
    selectedLinks,
}: {
    link: Graph3DLink
    selectedLinks: Set<Graph3DLink>
}): Set<Graph3DLink> {
    const next = new Set(selectedLinks)
    if (next.has(link)) next.delete(link)
    else next.add(link)
    return next
}

export function resetGraph3DSelection(): Graph3DSelectionState {
    return {
        selectedNodes: new Set(),
        selectedLinks: new Set(),
        highlightedNodeId: null,
        highlightedLinkId: null,
    }
}

export function setPointerCursor(isPointer: boolean) {
    document.body.style.cursor = isPointer ? "pointer" : "default"
}
