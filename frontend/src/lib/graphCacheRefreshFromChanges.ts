import type { ActiveTreeSelectionKind } from "@/components/shell/desktopShellContext";
import { isLinkDataChange, isPageDataChange } from "@/lib/notesCacheRefreshPolicy";
import type { DesktopDataChange, DesktopPageDataChange } from "@/types";
import type { GraphResponseNode } from "@/types/graph/Graph";

export type GraphRefreshPlan = {
  shouldMarkNamespaceStale: boolean;
  shouldRefreshGraph: boolean;
  nodeIdsToInvalidate: string[];
  selectedPageToRefresh: string | null;
};

function pageUpdateAffectsGraphTopology(change: DesktopPageDataChange): boolean {
  if (change.operation === "insert" || change.operation === "delete") {
    return true;
  }
  return change.change_kind === "metadata" || change.change_kind === "topology";
}

export type GraphRefreshContext = {
  activeTreeSelectionKind: ActiveTreeSelectionKind;
  graphNodes: GraphResponseNode[];
  graphScopeKind: string | null;
  graphScopeId: string | null;
  selectedPageId: string | null;
};

export function buildGraphRefreshPlan(
  changes: DesktopDataChange[],
  context: GraphRefreshContext,
): GraphRefreshPlan {
  const graphContainsNode = (nodeId: string) =>
    context.graphNodes.some((node) => String(node.id) === nodeId);
  const pageScopeMatchesNode = (nodeId: string) =>
    context.graphScopeKind === "page" && context.graphScopeId === nodeId;
  const graphScopeIsPresent = context.graphScopeKind !== null;

  let shouldMarkNamespaceStale = false;
  let shouldRefreshGraph = false;
  let selectedPageToRefresh: string | null = null;
  const nodeIdsToInvalidate = new Set<string>();

  const markSelectedPageForRefresh = (pageId: string) => {
    if (context.selectedPageId === pageId && context.activeTreeSelectionKind === "page") {
      selectedPageToRefresh = pageId;
    }
  };

  for (const change of changes) {
    if (isPageDataChange(change)) {
      const pageId = change.page_id;
      if (change.operation === "insert" || change.operation === "delete") {
        shouldMarkNamespaceStale = true;
        shouldRefreshGraph = shouldRefreshGraph || graphScopeIsPresent;
        continue;
      }

      if (pageUpdateAffectsGraphTopology(change)) {
        nodeIdsToInvalidate.add(pageId);
        if (graphContainsNode(pageId) || pageScopeMatchesNode(pageId)) {
          shouldRefreshGraph = true;
        }
      }

      markSelectedPageForRefresh(pageId);
      continue;
    }

    if (isLinkDataChange(change) && change.source_id && change.target_id) {
      nodeIdsToInvalidate.add(change.source_id);
      nodeIdsToInvalidate.add(change.target_id);
      if (
        graphContainsNode(change.source_id) ||
        graphContainsNode(change.target_id) ||
        pageScopeMatchesNode(change.source_id) ||
        pageScopeMatchesNode(change.target_id)
      ) {
        shouldRefreshGraph = true;
      }
      continue;
    }

    shouldMarkNamespaceStale = true;
    shouldRefreshGraph = shouldRefreshGraph || graphScopeIsPresent;
  }

  return {
    shouldMarkNamespaceStale,
    shouldRefreshGraph,
    nodeIdsToInvalidate: [...nodeIdsToInvalidate],
    selectedPageToRefresh,
  };
}

export type GraphRefreshEffects = {
  invalidateCachedGraphsContainingNode: (nodeId: string) => void;
  markCachedGraphsStaleByPrefix: (prefix: string) => void;
  markGraphStale: () => void;
  requestGraphRefresh: () => void;
};

export async function applyGraphRefreshPlan(
  plan: GraphRefreshPlan,
  graphCacheNamespace: string,
  graphMode: "synced" | "frozen",
  graphScopeIsPresent: boolean,
  effects: GraphRefreshEffects,
  openSelectedPage: ((pageId: string) => Promise<void>) | null,
): Promise<void> {
  for (const nodeId of plan.nodeIdsToInvalidate) {
    effects.invalidateCachedGraphsContainingNode(nodeId);
  }

  if (plan.shouldMarkNamespaceStale) {
    effects.markCachedGraphsStaleByPrefix(`${graphCacheNamespace}:`);
  }

  if (plan.selectedPageToRefresh && openSelectedPage) {
    await openSelectedPage(plan.selectedPageToRefresh);
  }

  if (graphMode === "frozen") {
    if (graphScopeIsPresent && (plan.shouldRefreshGraph || plan.shouldMarkNamespaceStale)) {
      effects.markGraphStale();
    }
    return;
  }

  if (plan.shouldRefreshGraph) {
    effects.requestGraphRefresh();
  }
}
