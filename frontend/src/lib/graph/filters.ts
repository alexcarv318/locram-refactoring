import type { GraphResponseLink, GraphResponseNode } from "@/types/graph/Graph";

import { isContextScopeNode } from "@/lib/graph/scopeOrigin";
import {
  isSelectionNarrowed,
  matchesMetadataRuleGroups,
  normalizeGraphFilters,
  type GraphFilterOptions,
  type GraphFiltersStoreState,
} from "@/lib/graph/filter-state/index";

function matchesSearchQuery(node: GraphResponseNode, searchLower: string) {
  if (!searchLower) {
    return true;
  }

  if (node.title.toLowerCase().includes(searchLower)) {
    return true;
  }

  if ((node.snippet ?? "").toLowerCase().includes(searchLower)) {
    return true;
  }

  if (node.subject.some((value) => value.toLowerCase().includes(searchLower))) {
    return true;
  }

  return node.tags.some((value) => value.toLowerCase().includes(searchLower));
}

function extractDatePortion(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function matchesDateRange(
  value: string | null | undefined,
  range: { from: string; to: string },
) {
  if (!range.from && !range.to) {
    return true;
  }

  const datePortion = extractDatePortion(value);
  if (!datePortion) {
    return false;
  }

  if (range.from && datePortion < range.from) {
    return false;
  }

  if (range.to && datePortion > range.to) {
    return false;
  }

  return true;
}

export function getSearchMatchedNodeIds(
  nodes: GraphResponseNode[],
  searchQuery: string,
): Set<string> {
  const searchLower = searchQuery.toLowerCase().trim();
  if (!searchLower) {
    return new Set();
  }
  return new Set(
    nodes
      .filter((node) => matchesSearchQuery(node, searchLower))
      .map((node) => String(node.id)),
  );
}

export function filterNodes(
  nodes: GraphResponseNode[],
  filters: GraphFiltersStoreState,
  optionsOverride?: GraphFilterOptions,
) {
  const resolvedOptions = optionsOverride ?? filters.options;
  const normalized = normalizeGraphFilters(filters, resolvedOptions);
  const { searchQuery, statuses, subjects, tags, types } = normalized;
  const searchLower = searchQuery.toLowerCase().trim();

  return nodes.filter((node) => {
    if (
      isSelectionNarrowed(types, resolvedOptions.types) &&
      !types.includes(node.type)
    ) {
      return false;
    }

    if (
      isSelectionNarrowed(statuses, resolvedOptions.statuses) &&
      !statuses.includes(node.status)
    ) {
      return false;
    }

    if (
      isSelectionNarrowed(subjects, resolvedOptions.subjects) &&
      !node.subject.some((value) => subjects.includes(value))
    ) {
      return false;
    }

    if (
      isSelectionNarrowed(tags, resolvedOptions.tags) &&
      !node.tags.some((value) => tags.includes(value))
    ) {
      return false;
    }

    if (
      !matchesMetadataRuleGroups(
        node,
        normalized.metadataRuleGroups,
        resolvedOptions,
      )
    ) {
      return false;
    }

    if (!matchesDateRange(node.created_at, normalized.createdAt)) {
      return false;
    }

    if (!matchesDateRange(node.updated_at, normalized.updatedAt)) {
      return false;
    }

    if (!matchesDateRange(node.reviewed_at, normalized.reviewedAt)) {
      return false;
    }

    return matchesSearchQuery(node, searchLower);
  });
}

export function filterScopeGraphData(
  data:
    | { nodes: GraphResponseNode[]; links: GraphResponseLink[] }
    | null
    | undefined,
  filters: GraphFiltersStoreState,
  optionsOverride?: GraphFilterOptions,
) {
  const normalizedData = {
    nodes: Array.isArray(data?.nodes) ? data.nodes : [],
    links: Array.isArray(data?.links) ? data.links : [],
  };
  const resolvedOptions = optionsOverride ?? filters.options;
  const normalized = normalizeGraphFilters(filters, resolvedOptions);
  const nodeById = new Map(
    normalizedData.nodes.map((node) => [String(node.id), node]),
  );
  const seedNodes = filterNodes(
    normalizedData.nodes.filter((node) => !isContextScopeNode(node)),
    filters,
    resolvedOptions,
  );
  const visibleSeedIds = new Set(seedNodes.map((node) => String(node.id)));

  const candidateLinks = normalizedData.links.filter((link) => {
    const relation = String(link.type ?? "");
    if (
      isSelectionNarrowed(normalized.linkTypes, resolvedOptions.linkTypes) &&
      !normalized.linkTypes.includes(relation)
    ) {
      return false;
    }
    return true;
  });

  const reachableContextIds = new Set<string>();
  const frontier = [...visibleSeedIds];
  const visitedIds = new Set(frontier);

  while (frontier.length > 0) {
    const currentId = frontier.shift();
    if (!currentId) {
      continue;
    }
    for (const link of candidateLinks) {
      const source =
        typeof link.source === "object" ? link.source.id : link.source;
      const target =
        typeof link.target === "object" ? link.target.id : link.target;
      const sourceId = String(source);
      const targetId = String(target);
      if (sourceId !== currentId && targetId !== currentId) {
        continue;
      }
      const otherId = sourceId === currentId ? targetId : sourceId;
      if (visitedIds.has(otherId)) {
        continue;
      }
      const otherNode = nodeById.get(otherId);
      if (!otherNode || !isContextScopeNode(otherNode)) {
        continue;
      }
      visitedIds.add(otherId);
      reachableContextIds.add(otherId);
      frontier.push(otherId);
    }
  }

  const visibleNodeIds = new Set([...visibleSeedIds, ...reachableContextIds]);
  const nodes = normalizedData.nodes.filter((node) =>
    visibleNodeIds.has(String(node.id)),
  );
  const links = candidateLinks.filter((link) => {
    const source =
      typeof link.source === "object" ? link.source.id : link.source;
    const target =
      typeof link.target === "object" ? link.target.id : link.target;
    return (
      visibleNodeIds.has(String(source)) && visibleNodeIds.has(String(target))
    );
  });

  return { nodes, links };
}
