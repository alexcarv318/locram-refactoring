import type { Graph2DLink, NodeId } from "@/lib/graph2d/types"

export function getLinkSourceId(link: Graph2DLink): NodeId {
    return typeof link.source === "object" ? link.source.id : link.source
}

export function getLinkTargetId(link: Graph2DLink): NodeId {
    return typeof link.target === "object" ? link.target.id : link.target
}

export function getLinkStableId(link: Graph2DLink): string | null {
    const srcId = getLinkSourceId(link)
    const tgtId = getLinkTargetId(link)
    if (!srcId || !tgtId) return null

    const type = link.type ? String(link.type) : ""
    return `${String(srcId)}->${String(tgtId)}:${type}`
}
