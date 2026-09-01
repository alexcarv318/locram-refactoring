import type { PageSummary } from "@/types";

import type {
  ReusedGraphData,
  ReusedGraphLink,
  ReusedGraphNode,
} from "../adapter";
import type {
  GraphDateRange,
  GraphFilterOptions,
  GraphFiltersState,
} from "./contract";
import { matchesMetadataRuleGroups } from "./metadata";
import { deriveGraphFilterOptions, normalizeGraphFilters } from "./options";

type PageSummaryCarrier = {
  title: string;
  subject: string[];
  tags: string[];
  created_at?: string;
  reviewed_at?: string | null;
  status: string;
  type: string;
  updated_at: string;
};

function matchesSearchQuery(node: ReusedGraphNode, searchLower: string) {
  if (!searchLower) {
    return true;
  }

  if (node.title.toLowerCase().includes(searchLower)) {
    return true;
  }

  if (node.snippet.toLowerCase().includes(searchLower)) {
    return true;
  }

  if (node.subject.some((value) => value.toLowerCase().includes(searchLower))) {
    return true;
  }

  return node.tags.some((value) => value.toLowerCase().includes(searchLower));
}

function matchesPageSummarySearchQuery(
  page: PageSummaryCarrier,
  searchLower: string,
) {
  if (!searchLower) {
    return true;
  }

  if (page.title.toLowerCase().includes(searchLower)) {
    return true;
  }

  if (page.subject.some((value) => value.toLowerCase().includes(searchLower))) {
    return true;
  }

  return page.tags.some((value) => value.toLowerCase().includes(searchLower));
}

function isSelectionNarrowed(
  selectedValues: string[],
  availableValues: string[],
) {
  if (availableValues.length === 0) {
    return false;
  }

  if (selectedValues.length !== availableValues.length) {
    return true;
  }

  const selectedSet = new Set(selectedValues);
  return availableValues.some((value) => !selectedSet.has(value));
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
  range: GraphDateRange,
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

export function filterGraphData(
  data: ReusedGraphData | null | undefined,
  filters: GraphFiltersState,
): ReusedGraphData {
  const normalizedData: ReusedGraphData = {
    nodes: Array.isArray(data?.nodes) ? data.nodes : [],
    links: Array.isArray(data?.links) ? data.links : [],
  };
  const searchLower = filters.searchQuery.toLowerCase().trim();
  const options = deriveGraphFilterOptions(normalizedData.nodes);
  const normalizedFilters = normalizeGraphFilters(filters, options);

  const nodes = normalizedData.nodes.filter((node) => {
    if (
      isSelectionNarrowed(normalizedFilters.types, options.types) &&
      !normalizedFilters.types.includes(node.type)
    ) {
      return false;
    }

    if (
      isSelectionNarrowed(normalizedFilters.statuses, options.statuses) &&
      !normalizedFilters.statuses.includes(node.status)
    ) {
      return false;
    }

    if (
      isSelectionNarrowed(normalizedFilters.subjects, options.subjects) &&
      !node.subject.some((value) => normalizedFilters.subjects.includes(value))
    ) {
      return false;
    }

    if (
      isSelectionNarrowed(normalizedFilters.tags, options.tags) &&
      !node.tags.some((value) => normalizedFilters.tags.includes(value))
    ) {
      return false;
    }

    if (
      !matchesMetadataRuleGroups(
        node,
        normalizedFilters.metadataRuleGroups,
        options,
      )
    ) {
      return false;
    }

    if (!matchesDateRange(node.created_at, normalizedFilters.createdAt)) {
      return false;
    }

    if (!matchesDateRange(node.updated_at, normalizedFilters.updatedAt)) {
      return false;
    }

    if (!matchesDateRange(node.reviewed_at, normalizedFilters.reviewedAt)) {
      return false;
    }

    return matchesSearchQuery(node, searchLower);
  });

  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const links = normalizedData.links.filter((link) => {
    if (!visibleNodeIds.has(link.source) || !visibleNodeIds.has(link.target)) {
      return false;
    }
    const relation = String(link.type ?? "");
    if (
      isSelectionNarrowed(normalizedFilters.linkTypes, options.linkTypes) &&
      !normalizedFilters.linkTypes.includes(relation)
    ) {
      return false;
    }
    return true;
  });

  return { nodes, links };
}

export function filterPageSummaries(
  pages: PageSummary[],
  filters: GraphFiltersState,
  options: GraphFilterOptions,
): PageSummary[] {
  const normalizedFilters = normalizeGraphFilters(filters, options);
  const searchLower = normalizedFilters.searchQuery.toLowerCase().trim();

  return pages.filter((page) => {
    if (
      isSelectionNarrowed(normalizedFilters.types, options.types) &&
      !normalizedFilters.types.includes(page.type)
    ) {
      return false;
    }

    if (
      isSelectionNarrowed(normalizedFilters.statuses, options.statuses) &&
      !normalizedFilters.statuses.includes(page.status)
    ) {
      return false;
    }

    if (
      isSelectionNarrowed(normalizedFilters.subjects, options.subjects) &&
      !(page.subject ?? []).some((value) =>
        normalizedFilters.subjects.includes(value),
      )
    ) {
      return false;
    }

    if (
      isSelectionNarrowed(normalizedFilters.tags, options.tags) &&
      !(page.tags ?? []).some((value) => normalizedFilters.tags.includes(value))
    ) {
      return false;
    }

    if (
      !matchesMetadataRuleGroups(
        {
          title: page.title,
          subject: page.subject ?? [],
          tags: page.tags ?? [],
        },
        normalizedFilters.metadataRuleGroups,
        options,
      )
    ) {
      return false;
    }

    if (!matchesDateRange(page.created_at, normalizedFilters.createdAt)) {
      return false;
    }

    if (!matchesDateRange(page.updated_at, normalizedFilters.updatedAt)) {
      return false;
    }

    if (!matchesDateRange(page.reviewed_at, normalizedFilters.reviewedAt)) {
      return false;
    }

    return matchesPageSummarySearchQuery(
      {
        title: page.title,
        subject: page.subject ?? [],
        tags: page.tags ?? [],
        created_at: page.created_at,
        reviewed_at: page.reviewed_at,
        status: page.status,
        type: page.type,
        updated_at: page.updated_at,
      },
      searchLower,
    );
  });
}

export function partitionGraphLinks(links: ReusedGraphLink[]) {
  return {
    hierarchy: links.filter((link) => link.type === "parent"),
    semantic: links.filter((link) => link.type !== "parent"),
  };
}
