import type {
  PageGraph,
  PageGraphLink,
  PageGraphNode,
  ScopeGraph,
} from "@/types";

export type ReusedGraphNode = {
  id: string;
  title: string;
  labels: string[];
  status: string;
  scopeOrigin?: "seed" | "context";
  parentId: string | null;
  snippet: string;
  type: string;
  subject: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  review_interval_days?: number | null;
};

export type ReusedGraphLink = {
  source: string;
  target: string;
  type: string;
};

export type ReusedGraphData = {
  nodes: ReusedGraphNode[];
  links: ReusedGraphLink[];
};

function adaptGraphPayloadToReusedGraph(
  payload:
    | {
        nodes?: PageGraphNode[] | null;
        links?: PageGraphLink[] | null;
      }
    | null
    | undefined,
): ReusedGraphData {
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const links = Array.isArray(payload?.links) ? payload.links : [];
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      title: node.title,
      labels: [node.type],
      status: node.status,
      scopeOrigin: node.scope_origin,
      parentId: node.parent_id,
      snippet: node.snippet,
      type: node.type,
      subject: node.subject,
      tags: node.tags,
      created_at: node.created_at,
      updated_at: node.updated_at,
      reviewed_at: node.reviewed_at,
      review_interval_days: node.review_interval_days,
    })),
    links: links.map((link) => ({
      source: link.source,
      target: link.target,
      type: link.type,
    })),
  };
}

export function adaptPageGraphToReusedGraph(
  pageGraph: PageGraph,
): ReusedGraphData {
  return adaptGraphPayloadToReusedGraph(pageGraph);
}

export function adaptScopeGraphToReusedGraph(
  scopeGraph: ScopeGraph,
): ReusedGraphData {
  return adaptGraphPayloadToReusedGraph(scopeGraph);
}
