import type { ActiveTreeSelectionKind } from "@/components/shell/desktopShellContext";

export type GraphMode = "synced" | "frozen";

export type ContentSaveGraphRefreshAction =
  | { kind: "mark-stale" }
  | { kind: "refresh-scope-graph-only" }
  | { kind: "patch-and-refresh-page-graph" }
  | { kind: "patch-and-refresh-scope-graph" };

export function resolveContentSaveGraphRefreshAction(
  activeTreeSelectionKind: ActiveTreeSelectionKind,
  graphMode: GraphMode,
  isSavedPageSelected: boolean,
): ContentSaveGraphRefreshAction {
  if (graphMode === "frozen") {
    return { kind: "mark-stale" };
  }
  if (!isSavedPageSelected) {
    return { kind: "refresh-scope-graph-only" };
  }
  if (activeTreeSelectionKind === "page") {
    return { kind: "patch-and-refresh-page-graph" };
  }
  return { kind: "patch-and-refresh-scope-graph" };
}
