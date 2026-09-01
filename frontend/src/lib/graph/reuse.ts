import type { GraphDataState } from "@/stores/graphStore"
import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph"

type GraphNodeLike = GraphResponseNode & Record<string, unknown>
type GraphLinkLike = GraphResponseLink & Record<string, unknown>

const NODE_DYNAMIC_FIELDS = ["x", "y", "z", "vx", "vy", "vz", "fx", "fy", "fz"] as const

function getLinkStableId(link: GraphLinkLike) {
  if (link?.id) {
    return String(link.id)
  }

  const source = typeof link?.source === "object" ? link.source?.id : link?.source
  const target = typeof link?.target === "object" ? link.target?.id : link?.target
  const type = link?.type ? String(link.type) : ""

  if (!source || !target) {
    return null
  }

  return `${String(source)}->${String(target)}:${type}`
}

function reuseNode(previousNode: GraphNodeLike, nextNode: GraphNodeLike) {
  const mergedNode = previousNode

  for (const key of Object.keys(mergedNode)) {
    if (!(key in nextNode) && !NODE_DYNAMIC_FIELDS.includes(key as (typeof NODE_DYNAMIC_FIELDS)[number])) {
      delete mergedNode[key]
    }
  }

  Object.assign(mergedNode, nextNode)
  for (const key of NODE_DYNAMIC_FIELDS) {
    if (previousNode[key] !== undefined && mergedNode[key] === undefined) {
      mergedNode[key] = previousNode[key]
    }
  }

  return mergedNode
}

function reuseLink(previousLink: GraphLinkLike, nextLink: GraphLinkLike) {
  const mergedLink = previousLink
  const previousSource = typeof previousLink.source === "object" ? previousLink.source?.id : previousLink.source
  const previousTarget = typeof previousLink.target === "object" ? previousLink.target?.id : previousLink.target
  const nextSource = typeof nextLink.source === "object" ? nextLink.source?.id : nextLink.source
  const nextTarget = typeof nextLink.target === "object" ? nextLink.target?.id : nextLink.target

  for (const key of Object.keys(mergedLink)) {
    if (!(key in nextLink)) {
      delete mergedLink[key]
    }
  }

  Object.assign(mergedLink, nextLink)

  if (previousSource === nextSource && previousLink.source !== undefined) {
    mergedLink.source = previousLink.source
  }

  if (previousTarget === nextTarget && previousLink.target !== undefined) {
    mergedLink.target = previousLink.target
  }

  return mergedLink
}

export function reuseGraphData(previousData: GraphDataState, nextData: GraphDataState): GraphDataState {
  const previousNodesById = new Map(
    (Array.isArray(previousData.nodes) ? previousData.nodes : []).map((node: GraphNodeLike) => [String(node?.id), node]),
  )
  const previousLinksById = new Map(
    (Array.isArray(previousData.links) ? previousData.links : [])
      .map((link: GraphLinkLike) => {
        const stableId = getLinkStableId(link)
        return stableId ? ([stableId, link] as const) : null
      })
      .filter(Boolean) as Array<readonly [string, GraphLinkLike]>,
  )

  const nodes = (Array.isArray(nextData.nodes) ? nextData.nodes : []).map((node: GraphNodeLike) => {
    const previousNode = previousNodesById.get(String(node?.id))
    if (!previousNode) {
      return node
    }

    return reuseNode(previousNode, node)
  })

  const links = (Array.isArray(nextData.links) ? nextData.links : []).map((link: GraphLinkLike) => {
    const stableId = getLinkStableId(link)
    if (!stableId) {
      return link
    }

    const previousLink = previousLinksById.get(stableId)
    if (!previousLink) {
      return link
    }

    return reuseLink(previousLink, link)
  })

  return { nodes, links }
}
