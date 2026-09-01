import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";

import type {
  SimpleMermaidEdge,
  SimpleMermaidEdgeStyle,
  SimpleMermaidGraph,
  SimpleMermaidNode,
  SimpleMermaidNodeShape,
  SimpleMermaidSubgraph,
} from "@/lib/graph/simpleMermaidModel";

const DEFAULT_MAX_NODES = 80;
const DEFAULT_MAX_EDGES = 160;

type GraphPayload = {
  nodes: GraphResponseNode[];
  links: GraphResponseLink[];
};

function normalizeGraphPayloadInput(
  data: GraphPayload | null | undefined,
): GraphPayload {
  return {
    nodes: Array.isArray(data?.nodes) ? data.nodes : [],
    links: Array.isArray(data?.links) ? data.links : [],
  };
}

interface SimpleMermaidAdapterOptions {
  direction?: "LR" | "TD";
  maxNodes?: number;
  maxEdges?: number;
  localizeEdgeLabel?: (rawType: string) => string;
}

export function buildSimpleMermaidGraph(
  data: GraphPayload | null | undefined,
  options?: SimpleMermaidAdapterOptions,
): SimpleMermaidGraph & {
  meta: {
    edgeCount: number;
    nodeCount: number;
    truncatedByClientLimit: boolean;
  };
} {
  const normalized = normalizeGraphPayload(
    normalizeGraphPayloadInput(data),
    options,
  );
  const nodeLabelById = new Map(
    normalized.nodes.map((node) => [node.id, node.label]),
  );

  const childCountByParentId = new Map<string, number>();
  for (const node of normalized.sourceNodes) {
    if (!node.parentId) {
      continue;
    }
    const parentId = String(node.parentId);
    childCountByParentId.set(
      parentId,
      (childCountByParentId.get(parentId) ?? 0) + 1,
    );
  }

  const subgraphs: SimpleMermaidSubgraph[] = [];
  const subgraphIds = new Set<string>();

  for (const [parentId, childCount] of childCountByParentId.entries()) {
    if (childCount <= 0 || !nodeLabelById.has(parentId)) {
      continue;
    }
    subgraphs.push({
      id: parentId,
      label: nodeLabelById.get(parentId) ?? parentId,
    });
    subgraphIds.add(parentId);
  }

  const nodes: SimpleMermaidNode[] = normalized.nodes.map((node) => {
    const parentId = node.parentId ? String(node.parentId) : null;
    const subgraphId =
      (parentId && subgraphIds.has(parentId) && parentId !== node.id
        ? parentId
        : undefined) ?? (subgraphIds.has(node.id) ? node.id : undefined);

    return {
      id: node.id,
      label: node.label,
      shape: resolveNodeShape(node.raw),
      semanticClass: resolveNodeSemanticClass(node.raw),
      subgraphId,
    };
  });

  return {
    direction: options?.direction ?? "LR",
    nodes,
    edges: normalized.edges,
    subgraphs,
    meta: {
      edgeCount: normalized.edges.length,
      nodeCount: normalized.nodes.length,
      truncatedByClientLimit: normalized.truncatedByClientLimit,
    },
  };
}

function normalizeGraphPayload(
  data: GraphPayload,
  options?: SimpleMermaidAdapterOptions,
): {
  sourceNodes: GraphResponseNode[];
  nodes: Array<{
    id: string;
    label: string;
    parentId?: string | null;
    raw: GraphResponseNode;
  }>;
  edges: SimpleMermaidEdge[];
  truncatedByClientLimit: boolean;
} {
  const maxNodes = options?.maxNodes ?? DEFAULT_MAX_NODES;
  const maxEdges = options?.maxEdges ?? DEFAULT_MAX_EDGES;
  const sourceNodes = Array.isArray(data.nodes) ? data.nodes : [];
  const sourceLinks = Array.isArray(data.links) ? data.links : [];
  const limitedSourceNodes = sourceNodes.slice(0, maxNodes);
  const includedNodeIds = new Set(
    limitedSourceNodes.map((node) => String(node.id)),
  );

  const nodes = limitedSourceNodes.map((node) => ({
    id: String(node.id),
    label: resolveNodeLabel(node),
    parentId: node.parentId ? String(node.parentId) : null,
    raw: node,
  }));

  const edges: SimpleMermaidEdge[] = [];
  const seenEdgeIds = new Set<string>();
  let hitEdgeCap = false;

  for (const link of sourceLinks) {
    const sourceId = getEndpointId(link.source);
    const targetId = getEndpointId(link.target);
    if (!sourceId || !targetId) {
      continue;
    }
    if (!includedNodeIds.has(sourceId) || !includedNodeIds.has(targetId)) {
      continue;
    }

    const stableId = getStableEdgeId(link, sourceId, targetId);
    if (seenEdgeIds.has(stableId)) {
      continue;
    }
    if (edges.length >= maxEdges) {
      hitEdgeCap = true;
      break;
    }

    seenEdgeIds.add(stableId);
    const rawLabel = String(link.type ?? "").trim();
    const finalLabel = options?.localizeEdgeLabel
      ? options.localizeEdgeLabel(rawLabel)
      : rawLabel;
    edges.push({
      id: stableId,
      source: sourceId,
      target: targetId,
      label: finalLabel,
      style: resolveEdgeStyle(link),
    });
  }

  return {
    sourceNodes: limitedSourceNodes,
    nodes,
    edges,
    truncatedByClientLimit: sourceNodes.length > maxNodes || hitEdgeCap,
  };
}

function getEndpointId(endpoint: GraphResponseLink["source"]): string | null {
  if (!endpoint) {
    return null;
  }
  if (typeof endpoint === "object" && "id" in endpoint) {
    return String(endpoint.id);
  }
  return String(endpoint);
}

function getStableEdgeId(
  link: GraphResponseLink,
  sourceId: string,
  targetId: string,
): string {
  if (link.id) {
    return String(link.id);
  }
  return `${sourceId}->${targetId}:${String(link.type ?? "")}`;
}

function resolveNodeLabel(node: GraphResponseNode): string {
  const rawLabel = String(
    node.title || node.heading || node.name || node.id || "Untitled",
  );
  return rawLabel.replace(/\s+/g, " ").trim() || "Untitled";
}

function resolveNodeShape(node: GraphResponseNode): SimpleMermaidNodeShape {
  const type = String(node.type ?? "").trim();
  if (type === "hub") {
    return "circle";
  }
  if (type === "structure") {
    return "round";
  }
  if (type === "note-taking") {
    return "stadium";
  }
  if (type === "fleeting") {
    return "diamond";
  }
  return "rect";
}

function resolveNodeSemanticClass(node: GraphResponseNode): string {
  const type = String(node.type ?? "").trim();
  return type || "unknown";
}

function resolveEdgeStyle(link: GraphResponseLink): SimpleMermaidEdgeStyle {
  if (link.parentChild || String(link.type ?? "") === "parent") {
    return "thick";
  }
  if (link.__isPending) {
    return "dotted";
  }
  return "solid";
}
