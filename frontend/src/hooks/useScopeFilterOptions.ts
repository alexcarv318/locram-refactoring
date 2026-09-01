import { useMemo } from "react";

import {
  deriveGraphFilterOptions,
  type GraphFilterOptions,
} from "@/lib/graph/filter-state/index";
import { useGraphFiltersStore } from "@/stores/graphFiltersStore";
import type { GraphResponseNode } from "@/types/graph/Graph";

function hasAvailableFilterValues(options: GraphFilterOptions): boolean {
  return (
    options.types.length > 0 ||
    options.statuses.length > 0 ||
    options.subjects.length > 0 ||
    options.tags.length > 0
  );
}

export function useScopeFilterOptions(
  nodes: GraphResponseNode[] | null | undefined,
  options?: { preserveStoreOptions?: boolean },
): GraphFilterOptions {
  const activePresetId = useGraphFiltersStore((state) => state.activePresetId);
  const storeOptions = useGraphFiltersStore((state) => state.options);
  const normalizedNodes = Array.isArray(nodes) ? nodes : [];
  const preserveStoreOptions = options?.preserveStoreOptions ?? false;

  return useMemo(
    () =>
      preserveStoreOptions || activePresetId || hasAvailableFilterValues(storeOptions)
        ? storeOptions
        : deriveGraphFilterOptions(normalizedNodes),
    [activePresetId, normalizedNodes, preserveStoreOptions, storeOptions],
  );
}
