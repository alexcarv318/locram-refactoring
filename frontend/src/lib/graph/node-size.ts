import { getPrimaryLabel } from "./labels"

const NODE_RADIUS_BY_PAGE_TYPE: Record<string, number> = {
    hub: 20,
    structure: 15,
    permanent: 11,
    "note-taking": 11,
    fleeting: 11,
    tag: 8,
}

const TAG_RADIUS_BASE = 16
const TAG_RADIUS_SQRT_SCALE = 4
const TAG_RADIUS_MAX = 52

export function getNodeRadiusForTagLinkCount(linkCount: number): number {
    const safe = Math.max(1, Math.floor(linkCount))
    const extra = TAG_RADIUS_SQRT_SCALE * Math.sqrt(Math.max(0, safe - 1))
    return Math.min(TAG_RADIUS_MAX, TAG_RADIUS_BASE + extra)
}

export function getNodeRadiusForPageTypeLabels(labels: string[] | undefined): number {
    if (!labels || labels.length === 0) {
        return NODE_RADIUS_BY_PAGE_TYPE.fleeting
    }
    const primary = getPrimaryLabel(labels)
    const radius = NODE_RADIUS_BY_PAGE_TYPE[primary]
    if (radius !== undefined) {
        return radius
    }
    return NODE_RADIUS_BY_PAGE_TYPE.fleeting
}

export function getNodeRadiusForGraphNode(node: {
    labels?: string[]
    type?: unknown
    tagLinkCount?: unknown
}): number {
    if (typeof node.type === "string" && node.type === "tag") {
        if (
            typeof node.tagLinkCount === "number" &&
            Number.isFinite(node.tagLinkCount) &&
            node.tagLinkCount >= 0
        ) {
            return getNodeRadiusForTagLinkCount(node.tagLinkCount)
        }
        return NODE_RADIUS_BY_PAGE_TYPE.tag
    }
    const labels = Array.isArray(node.labels) ? node.labels : []
    if (labels.length > 0) {
        return getNodeRadiusForPageTypeLabels(labels)
    }
    if (typeof node.type === "string" && node.type.length > 0) {
        return getNodeRadiusForPageTypeLabels([node.type])
    }
    return getNodeRadiusForPageTypeLabels(undefined)
}
