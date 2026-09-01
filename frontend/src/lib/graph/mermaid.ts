import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";

const DEFAULT_DIRECTION = "LR";
const DEFAULT_MAX_NODES = 80;
const DEFAULT_MAX_LINKS = 160;

export type MermaidGraphBuildResult = {
  diagram: string;
  edgeCount: number;
  nodeCount: number;
  truncated: boolean;
};

export function buildMermaidGraph(
  data:
    | { nodes: GraphResponseNode[]; links: GraphResponseLink[] }
    | null
    | undefined,
  options?: {
    direction?: "LR" | "TD";
    maxNodes?: number;
    maxLinks?: number;
  },
): MermaidGraphBuildResult {
  const direction = options?.direction ?? DEFAULT_DIRECTION;
  const maxNodes = options?.maxNodes ?? DEFAULT_MAX_NODES;
  const maxLinks = options?.maxLinks ?? DEFAULT_MAX_LINKS;

  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const links = Array.isArray(data?.links) ? data.links : [];

  const limitedNodes = nodes.slice(0, maxNodes);
  const includedNodeIds = new Set(limitedNodes.map((node) => String(node.id)));

  const limitedLinks: GraphResponseLink[] = [];
  const seenEdges = new Set<string>();
  for (const link of links) {
    const source = getEndpointId(link.source);
    const target = getEndpointId(link.target);
    if (!source || !target) {
      continue;
    }
    if (!includedNodeIds.has(source) || !includedNodeIds.has(target)) {
      continue;
    }
    const relation = String(link.type ?? "");
    const edgeKey = `${source}->${target}:${relation}`;
    if (seenEdges.has(edgeKey)) {
      continue;
    }
    seenEdges.add(edgeKey);
    limitedLinks.push(link);
    if (limitedLinks.length >= maxLinks) {
      break;
    }
  }

  const truncated =
    limitedNodes.length < nodes.length || limitedLinks.length < links.length;

  const lines = [`graph ${direction}`];

  for (const node of limitedNodes) {
    const nodeId = mermaidSafeNodeId(String(node.id));
    const label = escapeMermaidLabel(getNodeLabel(node));
    lines.push(`  ${nodeId}["${label}"]`);
  }

  for (const link of limitedLinks) {
    const source = mermaidSafeNodeId(getEndpointId(link.source) ?? "");
    const target = mermaidSafeNodeId(getEndpointId(link.target) ?? "");
    const relation = String(link.type ?? "").trim();
    if (relation) {
      lines.push(
        `  ${source} -->|${escapeMermaidEdgeLabel(relation)}| ${target}`,
      );
    } else {
      lines.push(`  ${source} --> ${target}`);
    }
  }

  for (const node of limitedNodes) {
    lines.push(
      `  class ${mermaidSafeNodeId(String(node.id))} ${nodeClassName(node)}`,
    );
  }

  lines.push("  classDef hub fill:#e3f2fd,stroke:#1d4ed8,color:#0f172a");
  lines.push("  classDef structure fill:#dcfce7,stroke:#15803d,color:#052e16");
  lines.push("  classDef permanent fill:#fef3c7,stroke:#b45309,color:#451a03");
  lines.push(
    "  classDef note-taking fill:#f3e8ff,stroke:#7e22ce,color:#3b0764",
  );
  lines.push("  classDef fleeting fill:#ffe4e6,stroke:#be123c,color:#4c0519");
  lines.push("  classDef unknown fill:#e5e7eb,stroke:#6b7280,color:#111827");

  return {
    diagram: lines.join("\n"),
    edgeCount: limitedLinks.length,
    nodeCount: limitedNodes.length,
    truncated,
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

function mermaidSafeNodeId(nodeId: string): string {
  return `n_${nodeId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

function getNodeLabel(node: GraphResponseNode): string {
  return String(
    node.title || node.heading || node.name || node.id || "Untitled",
  );
}

function escapeMermaidLabel(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\n/g, " ");
}

function escapeMermaidEdgeLabel(value: string): string {
  return value.replace(/["|]/g, "").replace(/\n/g, " ");
}

function nodeClassName(node: GraphResponseNode): string {
  const type = String(node.type || "").trim();
  if (
    type === "hub" ||
    type === "structure" ||
    type === "permanent" ||
    type === "note-taking" ||
    type === "fleeting"
  ) {
    return type;
  }
  return "unknown";
}
