import type { ActiveTreeSelectionKind } from "@/components/shell/desktopShellContext";
import type { RefreshNotesCachesParams } from "@/hooks/useDesktopBridgeData";
import type { ActiveSource } from "@/types/source";

export type CoarseDataVersionRefreshContext = {
  activeTreeSelectionKind: ActiveTreeSelectionKind;
  graphMode: "synced" | "frozen";
  graphScopeIsPresent: boolean;
  selectedPageId: string | null;
  smartFolderPresetReady: boolean;
};

export type CoarseDataVersionRefreshEffects = {
  applyNotesCacheRefresh: (
    targetScopeKey: string,
    params: Omit<RefreshNotesCachesParams, "targetScopeKey" | "activeSource">,
  ) => Promise<boolean>;
  markCachedGraphsStaleByPrefix: (prefix: string) => void;
  markGraphStale: () => void;
  requestGraphRefresh: () => void;
  openSelectedPage: (pageId: string) => Promise<void>;
};

export async function applyCoarseDataVersionRefresh(
  targetScopeKey: string,
  graphCacheNamespace: string,
  context: CoarseDataVersionRefreshContext,
  effects: CoarseDataVersionRefreshEffects,
): Promise<void> {
  const invalidatePromise = effects.applyNotesCacheRefresh(targetScopeKey, { kind: "structural" });
  effects.markCachedGraphsStaleByPrefix(`${graphCacheNamespace}:`);

  if (context.selectedPageId && context.activeTreeSelectionKind === "page") {
    await effects.openSelectedPage(context.selectedPageId);
    if (context.graphMode === "frozen") {
      if (context.graphScopeIsPresent) {
        effects.markGraphStale();
      }
      await invalidatePromise;
      return;
    }
    if (context.graphScopeIsPresent) {
      effects.requestGraphRefresh();
    }
    await invalidatePromise;
    return;
  }

  if (context.activeTreeSelectionKind === "notes") {
    if (context.graphMode === "frozen") {
      if (context.graphScopeIsPresent) {
        effects.markGraphStale();
      }
      await invalidatePromise;
      return;
    }
    if (context.graphScopeIsPresent) {
      effects.requestGraphRefresh();
    }
    await invalidatePromise;
    return;
  }

  if (context.activeTreeSelectionKind === "smart-folder") {
    if (!context.smartFolderPresetReady) {
      await invalidatePromise;
      return;
    }
    if (context.graphMode === "frozen") {
      effects.markGraphStale();
      await invalidatePromise;
      return;
    }
    effects.requestGraphRefresh();
    await invalidatePromise;
  }
}
