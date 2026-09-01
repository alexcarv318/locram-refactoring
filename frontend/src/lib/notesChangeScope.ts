import type { DesktopDataChange } from "@/types";

export function notesScopeKeyFromChangeScope(
  baseRef: string,
  entryId?: string | null,
): string | null {
  if (baseRef.startsWith("local:")) {
    const resolvedEntryId = entryId ?? baseRef.slice("local:".length);
    if (resolvedEntryId.length === 0) {
      return null;
    }
    return `local-base:${resolvedEntryId}`;
  }
  if (baseRef.startsWith("managed:")) {
    return baseRef;
  }
  return null;
}

export function groupChangesByNotesScopeKey(
  changes: DesktopDataChange[],
  fallbackScopeKey: string,
): Map<string, DesktopDataChange[]> {
  const groups = new Map<string, DesktopDataChange[]>();
  const unscopedChanges: DesktopDataChange[] = [];

  for (const change of changes) {
    if (!change.base_ref) {
      unscopedChanges.push(change);
      continue;
    }
    const scopeKey = notesScopeKeyFromChangeScope(change.base_ref, change.entry_id);
    if (scopeKey === null) {
      unscopedChanges.push(change);
      continue;
    }
    const scopeChanges = groups.get(scopeKey);
    if (scopeChanges === undefined) {
      groups.set(scopeKey, [change]);
      continue;
    }
    scopeChanges.push(change);
  }

  if (unscopedChanges.length > 0) {
    const fallbackChanges = groups.get(fallbackScopeKey);
    if (fallbackChanges === undefined) {
      groups.set(fallbackScopeKey, unscopedChanges);
    } else {
      groups.set(fallbackScopeKey, [...fallbackChanges, ...unscopedChanges]);
    }
  }

  return groups;
}
