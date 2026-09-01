import type {
  SimpleMermaidDirection,
  SimpleMermaidEdge,
  SimpleMermaidEdgeStyle,
  SimpleMermaidGraph,
  SimpleMermaidNode,
  SimpleMermaidNodeShape,
  SimpleMermaidSubgraph,
} from "@/lib/graph/simpleMermaidModel";

type MermaidSourceSupportResult =
  | {
      supported: true;
      graph: SimpleMermaidGraph;
    }
  | {
      supported: false;
      reason: string;
    };

type ParsedNodeReference = {
  id: string;
  label: string | null;
  shape: SimpleMermaidNodeShape;
};

type ParsedNodeState = {
  id: string;
  label: string;
  shape: SimpleMermaidNodeShape;
  subgraphId?: string;
};

type ParsedSubgraph = {
  id: string;
  label: string;
};

const MERMAID_HEADER_RE = /^(flowchart|graph)\s+(TB|TD|BT|LR|RL)\s*$/i;
const EDGE_RE = /^(.*?)\s*(-->|-\.->|==>)\s*(?:\|([^|]+)\|\s*)?(.*?)$/;
const NODE_ID_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
const FORBIDDEN_PREFIXES = ["class ", "classDef ", "click ", "linkStyle ", "style "];

export function buildSimpleMermaidGraphFromSource(
  source: string,
): MermaidSourceSupportResult {
  const normalized = source.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { supported: false, reason: "empty-diagram" };
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const header = lines[0]?.match(MERMAID_HEADER_RE);
  if (!header) {
    return { supported: false, reason: "unsupported-header" };
  }

  const direction = normalizeDirection(header[2] ?? "LR");
  const nodes = new Map<string, ParsedNodeState>();
  const edges: SimpleMermaidEdge[] = [];
  const subgraphs = new Map<string, { label: string; nodeIds: Set<string> }>();
  let activeSubgraph: ParsedSubgraph | null = null;

  for (const line of lines.slice(1)) {
    if (line.startsWith("%%{")) {
      return { supported: false, reason: "unsupported-directive" };
    }
    if (line.startsWith("%%")) {
      continue;
    }
    if (FORBIDDEN_PREFIXES.some((prefix) => line.startsWith(prefix))) {
      return { supported: false, reason: "unsupported-styling" };
    }

    if (/^subgraph\s+/i.test(line)) {
      if (activeSubgraph) {
        return { supported: false, reason: "nested-subgraph" };
      }
      const parsedSubgraph = parseSubgraph(line);
      if (!parsedSubgraph) {
        return { supported: false, reason: "invalid-subgraph" };
      }
      activeSubgraph = parsedSubgraph;
      if (!subgraphs.has(parsedSubgraph.id)) {
        subgraphs.set(parsedSubgraph.id, { label: parsedSubgraph.label, nodeIds: new Set() });
      }
      continue;
    }

    if (/^end$/i.test(line)) {
      if (!activeSubgraph) {
        return { supported: false, reason: "orphan-end" };
      }
      activeSubgraph = null;
      continue;
    }

    const parsedEdge = parseEdge(line);
    if (parsedEdge) {
      const mergedSource = mergeNode(nodes, parsedEdge.source, activeSubgraph?.id);
      const mergedTarget = mergeNode(nodes, parsedEdge.target, activeSubgraph?.id);
      if (!mergedSource || !mergedTarget) {
        return { supported: false, reason: "conflicting-node-definition" };
      }
      const stableEdgeId = `${mergedSource.id}->${mergedTarget.id}:${parsedEdge.label}:${parsedEdge.style}`;
      if (!edges.some((edge) => edge.id === stableEdgeId)) {
        edges.push({
          id: stableEdgeId,
          source: mergedSource.id,
          target: mergedTarget.id,
          label: parsedEdge.label,
          style: parsedEdge.style,
        });
      }
      if (activeSubgraph) {
        const subgraph = subgraphs.get(activeSubgraph.id);
        subgraph?.nodeIds.add(mergedSource.id);
        subgraph?.nodeIds.add(mergedTarget.id);
      }
      continue;
    }

    const parsedNode = parseNodeReference(line);
    if (!parsedNode) {
      return { supported: false, reason: "unsupported-line" };
    }
    const mergedNode = mergeNode(nodes, parsedNode, activeSubgraph?.id);
    if (!mergedNode) {
      return { supported: false, reason: "conflicting-node-definition" };
    }
    if (activeSubgraph) {
      subgraphs.get(activeSubgraph.id)?.nodeIds.add(mergedNode.id);
    }
  }

  if (activeSubgraph) {
    return { supported: false, reason: "unclosed-subgraph" };
  }

  const graphNodes: SimpleMermaidNode[] = Array.from(nodes.values()).map((node) => ({
    id: node.id,
    label: node.label,
    shape: node.shape,
    semanticClass: "unknown",
    subgraphId: node.subgraphId,
  }));

  if (graphNodes.length === 0) {
    return { supported: false, reason: "empty-diagram" };
  }

  const graphSubgraphs: SimpleMermaidSubgraph[] = Array.from(subgraphs.entries())
    .filter(([, subgraph]) => subgraph.nodeIds.size > 0)
    .map(([id, subgraph]) => ({
      id,
      label: subgraph.label,
    }));

  return {
    supported: true,
    graph: {
      direction,
      nodes: graphNodes,
      edges,
      subgraphs: graphSubgraphs,
    },
  };
}

function normalizeDirection(direction: string): SimpleMermaidDirection {
  return direction.toUpperCase() as SimpleMermaidDirection;
}

function parseSubgraph(line: string): ParsedSubgraph | null {
  const rawSubgraph = line.replace(/^subgraph\s+/i, "").trim();
  if (!rawSubgraph) {
    return null;
  }

  const nodeLike = parseNodeReference(rawSubgraph);
  if (nodeLike) {
    return {
      id: nodeLike.id,
      label: nodeLike.label ?? nodeLike.id,
    };
  }

  const sanitizedId = rawSubgraph
    .replace(/^["']|["']$/g, "")
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!sanitizedId) {
    return null;
  }

  return {
    id: `subgraph_${sanitizedId}`,
    label: rawSubgraph.replace(/^["']|["']$/g, "").trim(),
  };
}

function parseEdge(
  line: string,
): { source: ParsedNodeReference; target: ParsedNodeReference; label: string; style: SimpleMermaidEdgeStyle } | null {
  const match = line.match(EDGE_RE);
  if (!match) {
    return null;
  }

  const source = parseNodeReference(match[1] ?? "");
  const target = parseNodeReference(match[4] ?? "");
  if (!source || !target) {
    return null;
  }

  return {
    source,
    target,
    label: (match[3] ?? "").trim(),
    style: parseEdgeStyle(match[2] ?? "-->"),
  };
}

function parseEdgeStyle(operator: string): SimpleMermaidEdgeStyle {
  if (operator === "-.->") {
    return "dotted";
  }
  if (operator === "==>") {
    return "thick";
  }
  return "solid";
}

function parseNodeReference(rawValue: string): ParsedNodeReference | null {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  const stadium = matchWrappedNode(value, /\(\[(.*)\]\)$/);
  if (stadium) {
    return { id: stadium.id, label: stadium.label, shape: "stadium" };
  }

  const circle = matchWrappedNode(value, /\(\((.*)\)\)$/);
  if (circle) {
    return { id: circle.id, label: circle.label, shape: "circle" };
  }

  const diamond = matchWrappedNode(value, /\{(.*)\}$/);
  if (diamond) {
    return { id: diamond.id, label: diamond.label, shape: "diamond" };
  }

  const round = matchWrappedNode(value, /\((.*)\)$/);
  if (round) {
    return { id: round.id, label: round.label, shape: "round" };
  }

  const rect = matchWrappedNode(value, /\[(.*)\]$/);
  if (rect) {
    return { id: rect.id, label: rect.label, shape: "rect" };
  }

  if (NODE_ID_RE.test(value)) {
    return { id: value, label: null, shape: "rect" };
  }

  return null;
}

function matchWrappedNode(
  value: string,
  trailingLabelRe: RegExp,
): { id: string; label: string } | null {
  const firstDelimiterIndex = value.search(/[\[\(\{]/);
  if (firstDelimiterIndex <= 0) {
    return null;
  }

  const id = value.slice(0, firstDelimiterIndex).trim();
  if (!NODE_ID_RE.test(id)) {
    return null;
  }

  const labelMatch = value.slice(firstDelimiterIndex).match(trailingLabelRe);
  if (!labelMatch) {
    return null;
  }

  return {
    id,
    label: normalizeLabel(labelMatch[1] ?? id),
  };
}

function normalizeLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "";
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function mergeNode(
  nodes: Map<string, ParsedNodeState>,
  parsed: ParsedNodeReference,
  subgraphId?: string,
): ParsedNodeState | null {
  const existing = nodes.get(parsed.id);
  const nextLabel = parsed.label ? normalizeLabel(parsed.label) : parsed.id;
  if (!existing) {
    const nextNode = {
      id: parsed.id,
      label: nextLabel || parsed.id,
      shape: parsed.shape,
      subgraphId,
    };
    nodes.set(parsed.id, nextNode);
    return nextNode;
  }

  const sameShape = existing.shape === parsed.shape || parsed.label === null;
  const sameLabel = existing.label === nextLabel || nextLabel === parsed.id;
  const sameSubgraph = !existing.subgraphId || !subgraphId || existing.subgraphId === subgraphId;
  if (!sameShape || !sameLabel || !sameSubgraph) {
    return null;
  }

  if (existing.label === parsed.id && nextLabel !== parsed.id) {
    existing.label = nextLabel;
  }
  if (existing.shape === "rect" && parsed.shape !== "rect" && parsed.label !== null) {
    existing.shape = parsed.shape;
  }
  if (!existing.subgraphId && subgraphId) {
    existing.subgraphId = subgraphId;
  }

  return existing;
}
