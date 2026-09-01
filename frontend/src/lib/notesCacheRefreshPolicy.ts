import type {
  DesktopDataChange,
  DesktopLinkDataChange,
  DesktopPageDataChange,
  PageChangeKind,
} from "@/types";

export type NotesCacheRefreshKind = "structural" | "metadata" | "content";

const REFRESH_KIND_PRIORITY: Record<NotesCacheRefreshKind, number> = {
  content: 0,
  metadata: 1,
  structural: 2,
};

export function pageUpdateRefreshKind(changeKind?: PageChangeKind): NotesCacheRefreshKind {
  if (changeKind === "topology") {
    return "structural";
  }
  if (changeKind === "metadata") {
    return "metadata";
  }
  return "content";
}

export function mergeNotesCacheRefreshKinds(
  current: NotesCacheRefreshKind | null,
  next: NotesCacheRefreshKind,
): NotesCacheRefreshKind {
  if (current === null) {
    return next;
  }
  return REFRESH_KIND_PRIORITY[next] > REFRESH_KIND_PRIORITY[current] ? next : current;
}

export function notesCacheRefreshKindForChange(
  change: DesktopDataChange,
): NotesCacheRefreshKind | null {
  if (isPageDataChange(change)) {
    if (change.operation === "insert" || change.operation === "delete") {
      return "structural";
    }
    return pageUpdateRefreshKind(change.change_kind);
  }

  if (isLinkDataChange(change)) {
    return null;
  }

  return "structural";
}

export function resolveNotesCacheRefreshKindFromChanges(
  changes: DesktopDataChange[],
): NotesCacheRefreshKind | null {
  let kind: NotesCacheRefreshKind | null = null;
  for (const change of changes) {
    const changeKind = notesCacheRefreshKindForChange(change);
    if (changeKind === null) {
      continue;
    }
    kind = mergeNotesCacheRefreshKinds(kind, changeKind);
  }
  return kind;
}

export function isPageDataChange(change: DesktopDataChange): change is DesktopPageDataChange {
  return change.entity_kind === "page";
}

export function isLinkDataChange(change: DesktopDataChange): change is DesktopLinkDataChange {
  return change.entity_kind === "link";
}
