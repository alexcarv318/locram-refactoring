import type { PageGraph, PageSummary } from "@/types";
import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";

import { adaptPageGraphToReusedGraph } from "./adapter";
import { filterPageSummariesByTreeDepthFromRoots } from "./sharedBaseTreeDepth";

function linkKey(link: GraphResponseLink): string {
  const sourceId =
    typeof link.source === "string" ? link.source : String(link.source.id);
  const targetId =
    typeof link.target === "string" ? link.target : String(link.target.id);
  return `${sourceId}|${targetId}|${link.type ?? ""}|${link.parentChild ? "parent" : "link"}`;
}

function toGraphLink(
  source: string,
  target: string,
  type: string,
  parentChild = false,
): GraphResponseLink {
  return {
    source,
    target,
    type,
    parentChild,
  };
}

function parentLinksFromPages(pages: PageSummary[]): GraphResponseLink[] {
  const nodeIds = new Set(pages.map((page) => page.id));
  return pages
    .filter((page) => page.parent_id && nodeIds.has(page.parent_id))
    .map((page) =>
      toGraphLink(page.parent_id as string, page.id, "parent", true),
    );
}

function reusedNodeToGraphNode(
  node: ReturnType<typeof adaptPageGraphToReusedGraph>["nodes"][number],
): GraphResponseNode {
  return {
    id: node.id,
    title: node.title,
    type: node.type,
    status: node.status,
    labels: node.labels,
    scope_origin: node.scopeOrigin,
    subject: node.subject,
    tags: node.tags,
    parentId: node.parentId,
    snippet: node.snippet,
    created_at: node.created_at,
    updated_at: node.updated_at,
    reviewed_at: node.reviewed_at,
    review_interval_days: node.review_interval_days,
  };
}

export function mergeSharedBaseGraphFragments(
  pages: PageSummary[],
  pageGraphs: PageGraph[],
  mapPageToNode: (page: PageSummary) => GraphResponseNode,
): { nodes: GraphResponseNode[]; links: GraphResponseLink[] } {
  const nodeById = new Map<string, GraphResponseNode>();
  const linkByKey = new Map<string, GraphResponseLink>();

  for (const page of pages) {
    nodeById.set(page.id, mapPageToNode(page));
  }

  for (const link of parentLinksFromPages(pages)) {
    linkByKey.set(linkKey(link), link);
  }

  for (const pageGraph of pageGraphs) {
    const adapted = adaptPageGraphToReusedGraph(pageGraph);
    for (const node of adapted.nodes) {
      nodeById.set(node.id, reusedNodeToGraphNode(node));
    }
    for (const link of adapted.links) {
      const graphLink = toGraphLink(
        link.source,
        link.target,
        link.type,
        link.type === "parent",
      );
      linkByKey.set(linkKey(graphLink), graphLink);
    }
  }

  return {
    nodes: [...nodeById.values()],
    links: [...linkByKey.values()],
  };
}

export function filterSharedBaseGraphByDepth(
  graphData: { nodes: GraphResponseNode[]; links: GraphResponseLink[] },
  pages: PageSummary[],
  graphDepth: number,
  mapPageToNode: (page: PageSummary) => GraphResponseNode,
  activeNodeId?: string | null,
): { nodes: GraphResponseNode[]; links: GraphResponseLink[] } {
  if (!activeNodeId) {
    const depthFilteredPages = filterPageSummariesByTreeDepthFromRoots(
      pages,
      graphDepth,
    );
    const nodeIds = new Set(depthFilteredPages.map((page) => page.id));
    return {
      nodes: depthFilteredPages.map(mapPageToNode),
      links: graphData.links.filter((link) => {
        const sourceId =
          typeof link.source === "string" ? link.source : String(link.source.id);
        const targetId =
          typeof link.target === "string" ? link.target : String(link.target.id);
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      }),
    };
  }

  const adjacency = new Map<string, string[]>();
  for (const link of graphData.links) {
    const sourceId =
      typeof link.source === "string" ? link.source : String(link.source.id);
    const targetId =
      typeof link.target === "string" ? link.target : String(link.target.id);
    adjacency.set(sourceId, [...(adjacency.get(sourceId) ?? []), targetId]);
    adjacency.set(targetId, [...(adjacency.get(targetId) ?? []), sourceId]);
  }

  const includedIds = new Set<string>([activeNodeId]);
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: activeNodeId, depth: 0 },
  ];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= graphDepth) {
      continue;
    }
    for (const neighborId of adjacency.get(current.nodeId) ?? []) {
      if (includedIds.has(neighborId)) {
        continue;
      }
      includedIds.add(neighborId);
      queue.push({ nodeId: neighborId, depth: current.depth + 1 });
    }
  }

  return {
    nodes: graphData.nodes.filter((node) => includedIds.has(String(node.id))),
    links: graphData.links.filter((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : String(link.source.id);
      const targetId =
        typeof link.target === "string" ? link.target : String(link.target.id);
      return includedIds.has(sourceId) && includedIds.has(targetId);
    }),
  };
}

export function buildSharedBaseTopologyGraph(
  pages: PageSummary[],
  mapPageToNode: (page: PageSummary) => GraphResponseNode,
): { nodes: GraphResponseNode[]; links: GraphResponseLink[] } {
  return mergeSharedBaseGraphFragments(pages, [], mapPageToNode);
}

export const SHARED_BASE_GRAPH_PAGE_FETCH_CONCURRENCY = 6;

export type SharedBaseGraphLoadStats = {
  requestedPageCount: number;
  loadedPageGraphCount: number;
  failedPageCount: number;
};

export type SharedBaseGraphData = {
  nodes: GraphResponseNode[];
  links: GraphResponseLink[];
  loadStats: SharedBaseGraphLoadStats;
};

async function fetchSharedBasePageGraphs(
  pages: PageSummary[],
  fetchPageGraph: (pageId: string) => Promise<PageGraph>,
  concurrency = SHARED_BASE_GRAPH_PAGE_FETCH_CONCURRENCY,
): Promise<{ pageGraphs: PageGraph[]; failedPageIds: string[] }> {
  if (pages.length === 0) {
    return { pageGraphs: [], failedPageIds: [] };
  }

  const pageGraphs: PageGraph[] = [];
  const failedPageIds: string[] = [];
  let nextPageIndex = 0;
  const workerCount = Math.min(concurrency, pages.length);

  async function worker() {
    while (nextPageIndex < pages.length) {
      const pageIndex = nextPageIndex;
      nextPageIndex += 1;
      const page = pages[pageIndex];
      try {
        pageGraphs.push(await fetchPageGraph(page.id));
      } catch {
        failedPageIds.push(page.id);
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return { pageGraphs, failedPageIds };
}

export async function buildSharedBaseGraphData(
  pages: PageSummary[],
  graphDepth: number,
  mapPageToNode: (page: PageSummary) => GraphResponseNode,
  fetchPageGraph: (pageId: string) => Promise<PageGraph>,
  activeNodeId?: string | null,
): Promise<SharedBaseGraphData> {
  const { pageGraphs, failedPageIds } = await fetchSharedBasePageGraphs(
    pages,
    fetchPageGraph,
  );
  const merged = mergeSharedBaseGraphFragments(pages, pageGraphs, mapPageToNode);
  const filtered = filterSharedBaseGraphByDepth(
    merged,
    pages,
    graphDepth,
    mapPageToNode,
    activeNodeId,
  );
  return {
    ...filtered,
    loadStats: {
      requestedPageCount: pages.length,
      loadedPageGraphCount: pageGraphs.length,
      failedPageCount: failedPageIds.length,
    },
  };
}
