import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";

export interface GraphDataLike {
  nodes: GraphResponseNode[];
  links: GraphResponseLink[];
}

export interface EffectiveGraphDataOptions {
  graphData?: GraphDataLike | null;
  pendingGraphData?: GraphDataLike | null;
  fetchedGraphData?: GraphDataLike | null;
  usedContextLayerEnabled?: boolean;
  fetchedContextLayerEnabled?: boolean;
}

function getLinkStableId(link: GraphResponseLink) {
  if (link?.id) {
    return String(link.id);
  }

  const source = typeof link?.source === "object" ? link.source?.id : link?.source;
  const target = typeof link?.target === "object" ? link.target?.id : link?.target;
  const type = link?.type ? String(link.type) : "";
  if (!source || !target) {
    return null;
  }

  return `${String(source)}->${String(target)}:${type}`;
}

function resolveNodeId(endpoint: unknown): string {
  if (endpoint && typeof endpoint === "object" && "id" in endpoint) {
    return String((endpoint as { id: string }).id);
  }

  return String(endpoint);
}

export function buildEffectiveGraphData({
  graphData,
  pendingGraphData,
  fetchedGraphData,
  usedContextLayerEnabled = true,
  fetchedContextLayerEnabled = true,
}: EffectiveGraphDataOptions): GraphDataLike {
  const baseNodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
  const baseLinks = Array.isArray(graphData?.links) ? graphData.links : [];
  const pendingNodes = Array.isArray(pendingGraphData?.nodes) ? pendingGraphData.nodes : [];
  const pendingLinks = Array.isArray(pendingGraphData?.links) ? pendingGraphData.links : [];
  const fetchedNodes = Array.isArray(fetchedGraphData?.nodes) ? fetchedGraphData.nodes : [];
  const fetchedLinks = Array.isArray(fetchedGraphData?.links) ? fetchedGraphData.links : [];

  const baseNodeIds = new Set(baseNodes.map((node) => String(node?.id)));
  const baseLinkIds = new Set(baseLinks.map((link) => getLinkStableId(link)).filter(Boolean) as string[]);

  const usedNodes: GraphResponseNode[] = usedContextLayerEnabled
    ? [
        ...baseNodes.map((node) => ({ ...node, __isPending: false, opacity: 1 })),
        ...pendingNodes
          .filter((node) => !baseNodeIds.has(String(node?.id)))
          .map((node) => ({ ...node, __isPending: true, opacity: 1 })),
      ]
    : [];

  const usedLinks: GraphResponseLink[] = usedContextLayerEnabled
    ? [
        ...baseLinks.map((link) => ({
          ...link,
          __isPending: false,
          source: resolveNodeId(link?.source),
          target: resolveNodeId(link?.target),
        })),
      ]
    : [];

  for (const link of pendingLinks) {
    if (!usedContextLayerEnabled) {
      break;
    }

    const stableId = getLinkStableId(link);
    if (!stableId || baseLinkIds.has(stableId)) {
      continue;
    }

    usedLinks.push({
      ...link,
      __isPending: true,
      source: resolveNodeId(link?.source),
      target: resolveNodeId(link?.target),
    });
  }

  const nodes: GraphResponseNode[] = [...usedNodes];
  const usedNodeIds = new Set(usedNodes.map((node) => String(node?.id)));

  if (fetchedContextLayerEnabled) {
    for (const node of fetchedNodes) {
      const nodeId = String(node?.id);
      if (usedNodeIds.has(nodeId)) {
        continue;
      }

      nodes.push({ ...node, opacity: 0.35 });
    }
  }

  const links: GraphResponseLink[] = [...usedLinks];
  if (fetchedContextLayerEnabled) {
    const includedNodeIds = new Set(nodes.map((node) => String(node?.id)));

    for (const link of fetchedLinks) {
      const sourceId = resolveNodeId(link?.source);
      const targetId = resolveNodeId(link?.target);

      if (!includedNodeIds.has(sourceId) || !includedNodeIds.has(targetId)) {
        continue;
      }

      const alreadyInUsed = usedNodeIds.has(sourceId) && usedNodeIds.has(targetId);
      if (usedContextLayerEnabled && alreadyInUsed) {
        continue;
      }

      links.push({
        ...link,
        source: sourceId,
        target: targetId,
        _fetchedOnly: true,
      });
    }
  }

  return { nodes, links };
}
