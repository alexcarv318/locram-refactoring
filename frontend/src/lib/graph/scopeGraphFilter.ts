import { filterScopeGraphData } from "@/lib/graph/filters";
import type { GraphFilterOptions, GraphFiltersStoreState } from "@/lib/graph/filter-state/index";
import type { GraphScope } from "@/stores/graphStore";

export function buildGraphCanvasInstanceKey(
  graphScope: GraphScope | null | undefined,
  presentationEpoch: number,
): string {
  if (!graphScope) {
    return `none:${presentationEpoch}`;
  }
  if (graphScope.kind === "smart-folder") {
    return `smart-folder:${graphScope.presetId}:${presentationEpoch}`;
  }
  if (graphScope.kind === "source") {
    return `source:${graphScope.sourceId}:${presentationEpoch}`;
  }
  return `${graphScope.kind}:${graphScope.id}:${presentationEpoch}`;
}
import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";

type ScopeGraphData = {
  nodes: GraphResponseNode[];
  links: GraphResponseLink[];
};

export function shouldApplyClientScopeGraphFilter(
  graphScope: GraphScope | null | undefined,
): boolean {
  return graphScope?.kind !== "smart-folder";
}

export function applyScopeGraphFilter(
  data: ScopeGraphData,
  graphScope: GraphScope | null | undefined,
  filters: GraphFiltersStoreState,
  optionsOverride?: GraphFilterOptions,
): ScopeGraphData {
  if (!shouldApplyClientScopeGraphFilter(graphScope)) {
    return data;
  }
  return filterScopeGraphData(data, filters, optionsOverride);
}
