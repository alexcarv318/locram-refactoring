import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph"

export const TAG_NODE_ID_PREFIX = "locram:tag:"

export function makeTagNodeId(tagText: string): string {
    return `${TAG_NODE_ID_PREFIX}${encodeURIComponent(tagText)}`
}

export function isTagNodeId(id: string | null | undefined): boolean {
    return typeof id === "string" && id.startsWith(TAG_NODE_ID_PREFIX)
}

export function isTagGraphNode(node: { id?: unknown; type?: unknown }): boolean {
    if (typeof node.type === "string" && node.type === "tag") {
        return true
    }
    if (typeof node.id === "string") {
        return isTagNodeId(node.id)
    }
    return false
}

function createTagGraphNode(id: string, title: string, opacity: number, tagLinkCount: number): GraphResponseNode {
    return {
        id,
        title,
        type: "tag",
        status: "active",
        labels: ["tag"],
        subject: [],
        tags: [],
        snippet: "",
        parentId: null,
        created_at: "",
        updated_at: "",
        opacity,
        tagLinkCount,
    }
}

export function expandGraphWithTagNodes(data: {
    nodes: GraphResponseNode[]
    links: GraphResponseLink[]
}): { nodes: GraphResponseNode[]; links: GraphResponseLink[] } {
    const tagOpacityById = new Map<string, number>()
    const linksOut: GraphResponseLink[] = [...data.links]

    for (const node of data.nodes) {
        if (isTagGraphNode(node)) {
            continue
        }
        const tags = Array.isArray(node.tags) ? node.tags : []
        const pageOpacity = node.opacity !== undefined ? node.opacity : 1
        const uniqueTrimmed = [...new Set(tags.map((value) => String(value).trim()).filter((value) => value.length > 0))]
        for (const trimmed of uniqueTrimmed) {
            const tagId = makeTagNodeId(trimmed)
            tagOpacityById.set(tagId, Math.max(tagOpacityById.get(tagId) ?? 0, pageOpacity))
            linksOut.push({
                source: node.id,
                target: tagId,
                type: "tag",
            })
        }
    }

    const tagLinkCountById = new Map<string, number>()
    for (const link of linksOut) {
        if (link.type !== "tag") {
            continue
        }
        const targetId = typeof link.target === "string" ? link.target : link.target.id
        if (isTagNodeId(targetId)) {
            tagLinkCountById.set(targetId, (tagLinkCountById.get(targetId) ?? 0) + 1)
        }
    }

    const extraNodes: GraphResponseNode[] = []
    for (const [tagId, opacity] of tagOpacityById) {
        const encoded = tagId.slice(TAG_NODE_ID_PREFIX.length)
        let title = encoded
        try {
            title = decodeURIComponent(encoded)
        } catch {
            title = encoded
        }
        const tagLinkCount = tagLinkCountById.get(tagId) ?? 0
        extraNodes.push(createTagGraphNode(tagId, title, opacity, tagLinkCount))
    }

    return {
        nodes: [...data.nodes, ...extraNodes],
        links: linksOut,
    }
}
