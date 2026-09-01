import type { Graph2DLink, Graph2DNode } from "@/lib/graph2d/types"

export function getLinkDirectionalParticles(link: Graph2DLink | null | undefined): number {
    return link?.parentChild ? 4 : 2
}

export function isLinkIncidentToSelectedNodes({
    link,
    selectedNodes,
}: {
    link: Graph2DLink
    selectedNodes: Set<Graph2DNode>
}): boolean {
    if (!selectedNodes || selectedNodes.size === 0) return false

    const srcId = typeof link.source === "object" ? link.source.id : link.source
    const tgtId = typeof link.target === "object" ? link.target.id : link.target

    for (const node of selectedNodes) {
        if (node.id === srcId || node.id === tgtId) return true
    }

    return false
}

export function getLinkDirectionalParticleSpeed(): number {
    return 0.005
}
