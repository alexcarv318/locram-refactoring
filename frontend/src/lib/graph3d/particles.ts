import { getLinkStableId } from "@/lib/graph3d/render"
import type { Graph3DLink, Graph3DNode } from "@/lib/graph3d/types"

export function getLinkDirectionalParticles(link: Graph3DLink | null | undefined): number {
    return link?.parentChild ? 4 : 2
}

export function isLinkIncidentToSelectedNodes({
    link,
    selectedNodes,
}: {
    link: Graph3DLink
    selectedNodes: Set<Graph3DNode>
}): boolean {
    if (!selectedNodes || selectedNodes.size === 0) return false

    const srcId = typeof link.source === "object" ? link.source.id : link.source
    const tgtId = typeof link.target === "object" ? link.target.id : link.target

    for (const n of selectedNodes) {
        if (n.id === srcId || n.id === tgtId) return true
    }

    return false
}

export function getLinkDirectionalParticleWidth({
    link,
    selectedLinks,
    highlightedLinkId,
    selectedNodes,
}: {
    link: Graph3DLink
    selectedLinks: Set<Graph3DLink>
    highlightedLinkId: string | null
    selectedNodes: Set<Graph3DNode>
}): number {
    const linkId = getLinkStableId(link)

    if (selectedLinks.has(link)) return 3
    if (linkId && highlightedLinkId === linkId) return 3
    if (isLinkIncidentToSelectedNodes({ link, selectedNodes })) return 3
    return 0
}

export function getLinkDirectionalParticleSpeed(): number {
    return 0.002
}
