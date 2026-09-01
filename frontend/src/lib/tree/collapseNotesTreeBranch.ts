import { FOLDER_TYPES } from "@/lib/tree/notesTreeBuilder";
import type { PageSummary } from "@/types";

export function expandedIdsForActiveBranch(
  selectedPage: PageSummary,
  ancestorIds: string[],
): Set<string> {
  const branchIds = new Set(ancestorIds);
  if (FOLDER_TYPES.has(selectedPage.type)) {
    branchIds.add(selectedPage.id);
  }
  return branchIds;
}
