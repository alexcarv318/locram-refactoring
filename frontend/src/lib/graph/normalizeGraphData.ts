import { useMemo } from "react";

import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";

export type NormalizedGraphData = {
  nodes: GraphResponseNode[];
  links: GraphResponseLink[];
};

export function normalizeGraphData(
  data: NormalizedGraphData | null | undefined,
): NormalizedGraphData {
  return {
    nodes: Array.isArray(data?.nodes) ? data.nodes : [],
    links: Array.isArray(data?.links) ? data.links : [],
  };
}

export function useStableNormalizedGraphData(
  filteredGraphData: NormalizedGraphData | undefined,
  graphData: NormalizedGraphData,
): NormalizedGraphData {
  const rawInput = filteredGraphData ?? graphData;
  return useMemo(() => normalizeGraphData(rawInput), [rawInput]);
}
