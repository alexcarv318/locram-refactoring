import type { RefreshNotesCachesParams } from "@/hooks/useDesktopBridgeData";
import { resolveNotesCacheRefreshKindFromChanges } from "@/lib/notesCacheRefreshPolicy";
import { groupChangesByNotesScopeKey } from "@/lib/notesChangeScope";
import type { DesktopDataChange } from "@/types";
import type { ActiveSource } from "@/types/source";

export async function refreshNotesCachesForChanges(
  changes: DesktopDataChange[],
  fallbackScopeKey: string,
  applyNotesCacheRefresh: (
    targetScopeKey: string,
    params: Omit<RefreshNotesCachesParams, "targetScopeKey" | "activeSource">,
    activeSource: ActiveSource | null,
  ) => Promise<boolean>,
  activeSource: ActiveSource | null,
): Promise<void> {
  const changesByScopeKey = groupChangesByNotesScopeKey(changes, fallbackScopeKey);
  await Promise.all(
    [...changesByScopeKey.entries()].map(([targetScopeKey, scopeChanges]) => {
      const notesCacheRefreshKind = resolveNotesCacheRefreshKindFromChanges(scopeChanges);
      if (notesCacheRefreshKind === null || notesCacheRefreshKind === "content") {
        return Promise.resolve(false);
      }
      return applyNotesCacheRefresh(targetScopeKey, { kind: notesCacheRefreshKind }, activeSource);
    }),
  );
}
